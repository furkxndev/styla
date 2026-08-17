import type {
  ClothingAnalysisResult,
  ClothingItemResponse,
  DislikeReason,
  Occasion,
  OutfitScore,
  OutfitSlotRole,
  StylePreferences,
  WeatherSnapshot,
} from '../../../common/types/domain.types';

/**
 * AiService'in domain seviyesindeki giriş/çıkış sözleşmesi.
 * Kombin önerisi tamamen AI tarafından üretilir; uygulamada kural tabanlı
 * bir öneri algoritması bulunmaz.
 */

/** AI'a gönderilen sadeleştirilmiş gardırop parçası */
export interface AiWardrobeItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  colors: { name: string; family: string }[];
  pattern: string;
  styles: string[];
  seasons: string[];
  materials?: string[];
  formality: number;
  temperatureRange: { min: number; max: number };
  isFavorite: boolean;
  wearCount: number;
  lastWornAt?: string | null;
}

/** Kullanıcının geçmiş geri bildirimlerinden çıkarılan bağlam */
export interface AiFeedbackSignal {
  outfitDate: string;
  occasion: Occasion;
  itemIds: string[];
  feedback: 'liked' | 'disliked' | 'worn';
  reason?: DislikeReason;
}

export interface OutfitGenerationInput {
  userId: string;
  date: string;
  occasion: Occasion;
  wardrobe: AiWardrobeItem[];
  weather?: WeatherSnapshot;
  preferences?: StylePreferences;
  /** AI'ın kullanıcıyı tanıması için son geri bildirimler */
  feedbackHistory?: AiFeedbackSignal[];
  /** Tekrar öneri istendiğinde kaçınılacak parça kombinasyonları */
  excludeItemIds?: string[];
  /**
   * Kullanıcı "yeni kombin" istedi: bu parçalar en son önerilen kombindeydi ve
   * MÜMKÜNSE tekrar edilmemeli. Katı bir yasak değil — gardıropta alternatifi
   * olmayan bir kategori varsa (ör. tek pantolon) üretim tıkanmasın.
   */
  avoidRepeatItemIds?: string[];
  /** Kullanıcının sabitlediği parçalar */
  pinnedItemIds?: string[];
  notes?: string;
}

/** AI'ın döndürdüğü ham kombin önerisi (henüz DB'ye yazılmadan) */
export interface AiOutfitSuggestion {
  slots: { role: OutfitSlotRole; itemId: string; reason?: string }[];
  summary: string;
  stylingTip?: string;
  score: OutfitScore;
}

export interface AssistantQuestionInput {
  userId: string;
  question: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  wardrobe: AiWardrobeItem[];
  weather?: WeatherSnapshot;
  preferences?: StylePreferences;
  /** Kullanıcı belirli bir parça hakkında soruyorsa */
  focusItemId?: string;
}

export interface AiAssistantAnswer {
  /** Kullanıcıya gösterilecek cevap metni */
  message: string;
  /** Cevapta atıf yapılan gardırop parçalarının id'leri */
  referencedItemIds: string[];
  /** AI hazır bir kombin önerdiyse dolu gelir */
  suggestedOutfit?: AiOutfitSuggestion | null;
}

/**
 * AiService sözleşmesi — modüller yalnızca bu yüzeyi kullanır.
 * (Sağlayıcı detayları `AiProvider` arkasında gizlidir.)
 */
export interface AiServiceContract {
  analyzeClothingImage(imageDataUrl: string): Promise<ClothingAnalysisResult>;
  generateOutfit(input: OutfitGenerationInput): Promise<AiOutfitSuggestion>;
  answerStyleQuestion(
    input: AssistantQuestionInput,
  ): Promise<AiAssistantAnswer>;
}

/** Entity → AI girdisi dönüşümü için yardımcı tip */
export type ClothingItemLike = Pick<
  ClothingItemResponse,
  | 'id'
  | 'name'
  | 'category'
  | 'subcategory'
  | 'colors'
  | 'pattern'
  | 'styles'
  | 'seasons'
  | 'materials'
  | 'formality'
  | 'temperatureRange'
  | 'isFavorite'
  | 'wearCount'
  | 'lastWornAt'
>;
