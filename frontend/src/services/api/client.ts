import { config } from '../../constants/config';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { ApiError, type ApiErrorCode } from '../../types/api';
import { secureStorage } from '../storage';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** multipart/form-data gönderimleri için */
  formData?: FormData;
  timeoutMs?: number;
  /** Token eklenmesin (login/register) */
  skipAuth?: boolean;
  signal?: AbortSignal;
  /** İç kullanım: token yenilendikten sonraki tek seferlik tekrar denemesi */
  isRetry?: boolean;
}

type UnauthorizedHandler = () => void | Promise<void>;

/** 401 alındığında yeni access token üretmeyi dener; başarısızsa false döner */
type TokenRefresher = () => Promise<boolean>;

let onUnauthorized: UnauthorizedHandler | null = null;
let tokenRefresher: TokenRefresher | null = null;

/** Aynı anda birden fazla istek 401 alırsa tek bir yenileme çalışır */
let refreshInFlight: Promise<boolean> | null = null;

/** authStore oturum açtığında 401 davranışını buraya bağlar */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
};

/** authStore token yenileme fonksiyonunu buraya bağlar */
export const setTokenRefresher = (refresher: TokenRefresher | null) => {
  tokenRefresher = refresher;
};

const runRefresh = (): Promise<boolean> => {
  if (!tokenRefresher) return Promise.resolve(false);
  refreshInFlight ??= tokenRefresher().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  const base = config.apiUrl.replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );

  return params.length ? `${url}?${params.join('&')}` : url;
};

const statusToCode = (status: number): ApiErrorCode => {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'unknown';
};

const messageForCode = (code: ApiErrorCode, fallback?: string): string => {
  switch (code) {
    case 'network':
      return 'İnternet bağlantısı kurulamadı. Bağlantını kontrol et.';
    case 'timeout':
      return 'İstek zaman aşımına uğradı. Tekrar dene.';
    case 'unauthorized':
      return 'Oturumun sona erdi. Lütfen tekrar giriş yap.';
    case 'forbidden':
      return 'Bu işlem için yetkin yok.';
    case 'not_found':
      return 'Aradığın kayıt bulunamadı.';
    case 'validation':
      return fallback ?? 'Gönderilen bilgiler geçersiz.';
    case 'rate_limit':
      return 'Çok fazla istek gönderdin. Biraz bekle.';
    case 'server':
      return 'Sunucuda bir sorun oluştu. Birazdan tekrar dene.';
    default:
      return fallback ?? 'Beklenmeyen bir hata oluştu.';
  }
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    formData,
    timeoutMs = config.requestTimeoutMs,
    skipAuth = false,
    signal,
    isRetry = false,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!formData) headers['Content-Type'] = 'application/json';

  if (!skipAuth) {
    const token = await secureStorage.get(STORAGE_KEYS.accessToken);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      const code = statusToCode(response.status);

      if (code === 'unauthorized') {
        // Önce token yenilenmeye çalışılır; başarılıysa istek bir kez tekrarlanır.
        // Yenileme de başarısızsa oturum düşürülür.
        if (!skipAuth && !isRetry && (await runRefresh())) {
          clearTimeout(timeout);
          return request<T>(path, { ...options, isRetry: true });
        }
        await onUnauthorized?.();
      }

      const serverMessage =
        (parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : undefined) ?? undefined;
      throw new ApiError(
        code,
        messageForCode(code, serverMessage),
        response.status,
        parsed,
      );
    }

    // Backend {data: ...} sarmalı kullanıyorsa aç, kullanmıyorsa ham gövdeyi ver.
    // DİKKAT: yalnızca TEK anahtarı 'data' olan gövdeler sarmal sayılır. Aksi hâlde
    // sayfalı yanıtlar ({ data, page, total, hasMore }) yanlışlıkla açılır ve
    // sayfalama bilgisi kaybolur.
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'data' in parsed &&
      Object.keys(parsed).length === 1
    ) {
      return (parsed as { data: T }).data;
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new ApiError('timeout', messageForCode('timeout'));
    }
    throw new ApiError('network', messageForCode('network'), undefined, error);
  } finally {
    clearTimeout(timeout);
  }
}

const safeJsonParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
  upload: <T>(
    path: string,
    formData: FormData,
    options?: Omit<RequestOptions, 'method' | 'formData'>,
  ) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      formData,
      timeoutMs: options?.timeoutMs ?? config.aiRequestTimeoutMs,
    }),
};

export { ApiError };
