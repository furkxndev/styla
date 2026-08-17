import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import type {
  AiModelOption,
  AiProviderAccountUsage,
} from '../../../common/types/domain.types';
import {
  AiConfigurationException,
  AiProviderUnavailableException,
  AiResponseFormatException,
} from '../ai.errors';
import type {
  AiCompletionOptions,
  AiMessage,
  AiProvider,
  AiResult,
  AiUsage,
} from '../interfaces/ai-provider.interface';

/** OpenRouter (OpenAI uyumlu) chat/completions gövde tipleri */
interface OpenRouterContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenRouterContentPart[];
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  /** Maliyet takibi için zorunlu: yanıtta usage.cost döndürür */
  usage: { include: true };
}

interface OpenRouterResponseBody {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    /** USD */
    cost?: number;
  };
  error?: { message?: string; code?: number | string };
}

/** GET /key yanıtı */
interface OpenRouterKeyResponse {
  data?: {
    usage?: number;
    usage_daily?: number;
    usage_weekly?: number;
    usage_monthly?: number;
    limit?: number | null;
    limit_remaining?: number | null;
  };
}

/** GET /credits yanıtı */
interface OpenRouterCreditsResponse {
  data?: {
    total_credits?: number;
    total_usage?: number;
  };
}

/** GET /models yanıtındaki tek kayıt */
interface OpenRouterModelEntry {
  id?: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string | number; completion?: string | number };
  architecture?: { input_modalities?: string[] };
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModelEntry[];
}

/** Sağlayıcı yapılandırması — tamamı ConfigService'ten okunur */
interface OpenRouterSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  visionModel: string;
  appUrl: string;
  appTitle: string;
  timeoutMs: number;
  maxRetries: number;
}

/** İç kullanım: ham metin + ölçüm; JSON ayrıştırması bunun üstünde yapılır */
interface RawCompletion {
  content: string;
  model: string;
  usage: AiUsage;
}

/** Süreli bellek önbelleği (tek instance; yatay ölçekte her pod kendi kopyasını tutar) */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const ACCOUNT_USAGE_TTL_MS = 60_000;
const MODELS_TTL_MS = 5 * 60_000;
/** Admin uçları kullanıcıyı bekletmemeli; sohbet timeout'undan bağımsız */
const META_TIMEOUT_MS = 15_000;

const RETRYABLE_STATUS = (status: number): boolean =>
  status === 429 || status >= 500;

export class OpenRouterProvider implements AiProvider {
  readonly name = 'openrouter';

  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly settings: OpenRouterSettings;

  private accountUsageCache: CacheEntry<AiProviderAccountUsage | null> | null =
    null;
  private modelsCache: CacheEntry<AiModelOption[]> | null = null;

  constructor(config: ConfigService) {
    this.settings = {
      apiKey: config.get<string>('ai.openRouter.apiKey') ?? '',
      baseUrl:
        config.get<string>('ai.openRouter.baseUrl') ??
        'https://openrouter.ai/api/v1',
      model: config.get<string>('ai.openRouter.model') ?? '',
      visionModel: config.get<string>('ai.openRouter.visionModel') ?? '',
      appUrl: config.get<string>('ai.openRouter.appUrl') ?? '',
      appTitle: config.get<string>('ai.openRouter.appTitle') ?? 'Kombin',
      timeoutMs: config.get<number>('ai.openRouter.timeoutMs') ?? 60000,
      maxRetries: config.get<number>('ai.openRouter.maxRetries') ?? 2,
    };

    if (!this.settings.apiKey) {
      throw new AiConfigurationException('OPENROUTER_API_KEY tanımlı değil');
    }
    if (!this.settings.model) {
      throw new AiConfigurationException('OPENROUTER_MODEL tanımlı değil');
    }
  }

  async complete(
    messages: AiMessage[],
    options: AiCompletionOptions = {},
  ): Promise<AiResult<string>> {
    const raw = await this.request(messages.map(toOpenRouterMessage), options);
    return { data: raw.content, model: raw.model, usage: raw.usage };
  }

  async completeJson<T>(
    messages: AiMessage[],
    options: AiCompletionOptions = {},
  ): Promise<AiResult<T>> {
    const raw = await this.request(messages.map(toOpenRouterMessage), {
      ...options,
      json: true,
    });
    return {
      data: parseJsonContent<T>(raw.content),
      model: raw.model,
      usage: raw.usage,
    };
  }

  async completeWithImage<T>(
    prompt: string,
    imageDataUrl: string,
    options: AiCompletionOptions = {},
  ): Promise<AiResult<T>> {
    // OpenAI uyumlu çoklu-içerik formatı: metin + görsel
    const message: OpenRouterMessage = {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    };

    const raw = await this.request([message], {
      ...options,
      json: true,
      model: options.model || this.settings.visionModel || this.settings.model,
    });
    return {
      data: parseJsonContent<T>(raw.content),
      model: raw.model,
      usage: raw.usage,
    };
  }

  /**
   * Hesabın gerçek harcaması. Admin paneli bu veri olmadan da çalışmalı,
   * bu yüzden her hata null'a çevrilir ve yalnızca uyarı olarak loglanır.
   */
  async getAccountUsage(): Promise<AiProviderAccountUsage | null> {
    const cached = readCache(this.accountUsageCache);
    if (cached !== undefined) {
      return cached;
    }

    let usage: AiProviderAccountUsage | null = null;
    try {
      const [key, credits] = await Promise.all([
        this.getJson<OpenRouterKeyResponse>('/key'),
        // Kredi bilgisi opsiyonel; erişilemezse kullanım verisi yine de gösterilir
        this.getJson<OpenRouterCreditsResponse>('/credits').catch(() => null),
      ]);

      const data = key.data;
      if (data) {
        usage = {
          usageDaily: toNumber(data.usage_daily) ?? 0,
          usageWeekly: toNumber(data.usage_weekly) ?? 0,
          usageMonthly: toNumber(data.usage_monthly) ?? 0,
          usageTotal: toNumber(data.usage) ?? 0,
          limit: toNumber(data.limit),
          limitRemaining: toNumber(data.limit_remaining),
          creditsTotal: toNumber(credits?.data?.total_credits),
          creditsUsed: toNumber(credits?.data?.total_usage),
        };
      }
    } catch (error) {
      this.logger.warn(
        `OpenRouter hesap kullanımı okunamadı: ${describeError(error)}`,
      );
      usage = null;
    }

    this.accountUsageCache = {
      value: usage,
      expiresAt: Date.now() + ACCOUNT_USAGE_TTL_MS,
    };
    return usage;
  }

  /**
   * Model kataloğu (400+ kayıt). Filtreleme/arama admin panelinde yapıldığı
   * için liste kırpılmadan döndürülür.
   */
  async listModels(): Promise<AiModelOption[]> {
    const cached = readCache(this.modelsCache);
    if (cached !== undefined) {
      return cached;
    }

    let payload: OpenRouterModelsResponse;
    try {
      payload = await this.getJson<OpenRouterModelsResponse>('/models');
    } catch (error) {
      this.logger.warn(
        `OpenRouter model listesi alınamadı: ${describeError(error)}`,
      );
      throw new AiProviderUnavailableException('model listesi alınamadı');
    }

    const models: AiModelOption[] = (payload.data ?? [])
      .filter((entry): entry is OpenRouterModelEntry & { id: string } =>
        Boolean(entry?.id),
      )
      .map((entry) => ({
        id: entry.id,
        name: entry.name ?? entry.id,
        contextLength: toNumber(entry.context_length) ?? 0,
        promptPrice: toNumber(entry.pricing?.prompt) ?? 0,
        completionPrice: toNumber(entry.pricing?.completion) ?? 0,
        supportsImages: (entry.architecture?.input_modalities ?? []).includes(
          'image',
        ),
      }));

    this.modelsCache = { value: models, expiresAt: Date.now() + MODELS_TTL_MS };
    return models;
  }

  /** Tek bir chat/completions çağrısı + yeniden deneme döngüsü */
  private async request(
    messages: OpenRouterMessage[],
    options: AiCompletionOptions,
  ): Promise<RawCompletion> {
    const model = options.model ?? this.settings.model;
    const body: OpenRouterRequestBody = {
      model,
      messages,
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.maxTokens !== undefined
        ? { max_tokens: options.maxTokens }
        : {}),
      ...(options.json
        ? { response_format: { type: 'json_object' as const } }
        : {}),
      // Maliyet yalnızca bu bayrakla döndüğü için her istekte gönderilir
      usage: { include: true },
    };

    const timeoutMs = options.timeoutMs ?? this.settings.timeoutMs;
    const startedAt = Date.now();
    let lastFailure = 'bilinmeyen hata';

    for (let attempt = 0; attempt <= this.settings.maxRetries; attempt += 1) {
      if (attempt > 0) {
        // 200ms * 2^n üstel geri çekilme
        await delay(200 * 2 ** (attempt - 1));
      }

      try {
        const response = await this.send(body, timeoutMs);
        const payload = (await response
          .json()
          .catch(() => null)) as OpenRouterResponseBody | null;

        if (!response.ok) {
          lastFailure = `HTTP ${response.status}`;
          if (
            RETRYABLE_STATUS(response.status) &&
            attempt < this.settings.maxRetries
          ) {
            this.logger.warn(
              `OpenRouter geçici hata (model=${model}, status=${response.status}), tekrar denenecek`,
            );
            continue;
          }
          // İçeriği loglamıyoruz; sadece durum kodu güvenli bilgi
          throw new AiProviderUnavailableException(`HTTP ${response.status}`);
        }

        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || content.trim().length === 0) {
          lastFailure = 'boş yanıt';
          if (attempt < this.settings.maxRetries) {
            this.logger.warn(
              `OpenRouter boş yanıt döndü (model=${model}), tekrar denenecek`,
            );
            continue;
          }
          throw new AiResponseFormatException('model boş yanıt döndü');
        }

        const usage: AiUsage = {
          promptTokens: payload?.usage?.prompt_tokens,
          completionTokens: payload?.usage?.completion_tokens,
          totalTokens: payload?.usage?.total_tokens,
          cost: toNumber(payload?.usage?.cost) ?? undefined,
        };

        this.logger.log(
          `OpenRouter tamamlandı model=${payload?.model ?? model} süre=${Date.now() - startedAt}ms ` +
            `token=${usage.totalTokens ?? '?'} maliyet=${usage.cost ?? '?'}`,
        );

        return { content, model: payload?.model ?? model, usage };
      } catch (error) {
        if (
          error instanceof AiProviderUnavailableException ||
          error instanceof AiResponseFormatException
        ) {
          throw error;
        }

        // Ağ hatası / timeout: son denemeye kadar tekrar dene
        lastFailure =
          error instanceof Error && error.name === 'AbortError'
            ? 'zaman aşımı'
            : 'bağlantı hatası';
        if (attempt < this.settings.maxRetries) {
          this.logger.warn(
            `OpenRouter isteği başarısız (${lastFailure}), tekrar denenecek`,
          );
          continue;
        }
        throw new AiProviderUnavailableException(lastFailure);
      }
    }

    throw new AiProviderUnavailableException(lastFailure);
  }

  /** AbortController ile zaman aşımı uygulanan tek HTTP isteği */
  private async send(
    body: OpenRouterRequestBody,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(
        `${trimTrailingSlash(this.settings.baseUrl)}/chat/completions`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /** Meta uçları (/key, /credits, /models) için basit GET yardımcısı */
  private async getJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), META_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${trimTrailingSlash(this.settings.baseUrl)}${path}`,
        {
          method: 'GET',
          headers: this.buildHeaders(),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        // Yanıt gövdesi anahtar parçası içerebilir; yalnızca durum kodu taşınır
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.settings.apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': this.settings.appTitle,
    };
    // Boş appUrl gönderilirse OpenRouter başlığı reddedebiliyor
    if (this.settings.appUrl) {
      headers['HTTP-Referer'] = this.settings.appUrl;
    }
    return headers;
  }
}

/** Domain mesajını OpenAI uyumlu gövdeye çevirir */
function toOpenRouterMessage(message: AiMessage): OpenRouterMessage {
  if (typeof message.content === 'string') {
    return { role: message.role, content: message.content };
  }

  const parts: OpenRouterContentPart[] = message.content.map((part) =>
    part.type === 'text'
      ? { type: 'text', text: part.text }
      : { type: 'image_url', image_url: { url: part.imageUrl } },
  );

  return { role: message.role, content: parts };
}

/**
 * Model bazen JSON'u kod bloğu veya açıklama içine sarıyor.
 * Önce code fence temizlenir, olmazsa ilk '{' ile son '}' arası alınır.
 */
export function extractJson(raw: string): string {
  const withoutFence = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  if (withoutFence.startsWith('{') && withoutFence.endsWith('}')) {
    return withoutFence;
  }

  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new AiResponseFormatException('yanıt içinde JSON nesnesi bulunamadı');
  }

  return withoutFence.slice(start, end + 1);
}

function parseJsonContent<T>(raw: string): T {
  const candidate = extractJson(raw);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw new AiResponseFormatException('yanıt geçerli JSON değil');
  }
}

/** Süresi dolmamış önbellek değeri; yoksa undefined (null da geçerli bir değer) */
function readCache<T>(entry: CacheEntry<T> | null): T | undefined {
  return entry && entry.expiresAt > Date.now() ? entry.value : undefined;
}

/** OpenRouter fiyatları string olarak döner ("0.000003") */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Log'a yalnızca hata sınıfı/durum kodu düşer; anahtar hiçbir yolla sızmaz */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'AbortError' ? 'zaman aşımı' : error.message;
  }
  return 'bilinmeyen hata';
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
