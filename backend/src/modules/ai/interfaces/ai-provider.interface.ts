import type {
  AiModelOption,
  AiProviderAccountUsage,
} from '../../../common/types/domain.types';

/**
 * AI sağlayıcı sözleşmesi.
 *
 * Uygulamanın geri kalanı yalnızca bu arayüzü tanır. Sağlayıcı değiştirmek
 * (OpenRouter → başka bir servis) için tek yapılması gereken bu arayüzü
 * uygulayan yeni bir sınıf yazıp `AiModule` içindeki factory'ye eklemektir.
 */

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type AiMessageRole = 'system' | 'user' | 'assistant';

/** Metin veya görsel içerebilen mesaj parçası */
export type AiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string };

export interface AiMessage {
  role: AiMessageRole;
  content: string | AiContentPart[];
}

export interface AiCompletionOptions {
  /** Sağlayıcı varsayılanını ezmek için */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** true ise sağlayıcıdan geçerli JSON dönmesi istenir */
  json?: boolean;
  timeoutMs?: number;
}

/** Tek bir çağrının token/maliyet bilgisi (admin paneli bunu toplar) */
export interface AiUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** USD cinsinden maliyet — sağlayıcı bildirmiyorsa undefined */
  cost?: number;
}

/**
 * Sağlayıcı yanıtı. Maliyet takibi yapılabilmesi için ham veri değil
 * bu zarf döndürülür; `data` çağıranın beklediği tiptir.
 */
export interface AiResult<T> {
  data: T;
  /** Gerçekte kullanılan model kimliği */
  model: string;
  usage?: AiUsage;
}

export interface AiProvider {
  /** Sağlayıcının tanımlayıcı adı: 'openrouter' vb. */
  readonly name: string;

  /** Serbest metin tamamlaması */
  complete(
    messages: AiMessage[],
    options?: AiCompletionOptions,
  ): Promise<AiResult<string>>;

  /**
   * JSON çıktı bekleyen tamamlama. Sağlayıcı JSON modunu destekliyorsa
   * kullanır, desteklemiyorsa çıktıyı ayrıştırmak uygulayıcının sorumluluğundadır.
   */
  completeJson<T>(
    messages: AiMessage[],
    options?: AiCompletionOptions,
  ): Promise<AiResult<T>>;

  /** Görsel destekli model kullanan tamamlama (kıyafet analizi) */
  completeWithImage<T>(
    prompt: string,
    imageDataUrl: string,
    options?: AiCompletionOptions,
  ): Promise<AiResult<T>>;

  /**
   * Sağlayıcı hesabının bildirdiği kullanım/limit bilgisi (admin paneli).
   * Sağlayıcı desteklemiyorsa null döner.
   */
  getAccountUsage(): Promise<AiProviderAccountUsage | null>;

  /** Admin panelindeki model seçici için kullanılabilir modeller */
  listModels(): Promise<AiModelOption[]>;
}
