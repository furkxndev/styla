import type { ClothingItem } from './clothing';
import type { WeatherSnapshot } from './weather';

export type Occasion =
  | 'daily'
  | 'university'
  | 'work'
  | 'sport'
  | 'friends'
  | 'dinner'
  | 'special_event'
  | 'travel';

export type OutfitFeedback = 'liked' | 'disliked' | 'worn' | null;

/** Kombindeki tek bir parça + AI'ın onu neden seçtiği */
export interface OutfitSlot {
  /** 'top' | 'bottom' | 'shoes' ... yerleşim rolü */
  role: 'outerwear' | 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory' | 'bag';
  itemId: string;
  item: ClothingItem;
  reason?: string;
}

export interface OutfitScore {
  /** 0-100 arası bileşen skorları — AI'ın kararını şeffaf göstermek için */
  colorHarmony: number;
  styleCoherence: number;
  weatherFit: number;
  personalPreference: number;
  overall: number;
}

export interface Outfit {
  id: string;
  userId: string;
  /** Kombinin oluşturulduğu gün (YYYY-MM-DD) */
  date: string;
  occasion: Occasion;
  slots: OutfitSlot[];
  /** AI'ın kombini özetleyen kısa metni */
  summary: string;
  /** Stil ipucu / püf noktası */
  stylingTip?: string;
  score: OutfitScore;
  weather?: WeatherSnapshot;
  feedback: OutfitFeedback;
  /** Kullanıcı "Bugün bunu giydim" dediyse dolu olur */
  wornAt?: string | null;
  /** Kullanıcının kombine eklediği not */
  note?: string;
  photoUrl?: string;
  isGeneratedByAI: boolean;
  createdAt: string;
}

export interface GenerateOutfitRequest {
  date: string;
  occasion: Occasion;
  weather?: WeatherSnapshot;
  /** Yeniden üretim isteniyorsa daha önce reddedilen kombin id'leri */
  excludeOutfitIds?: string[];
  /**
   * Kullanıcı açıkça farklı bir kombin istedi ("Yeni kombin", ortam değişikliği).
   * Backend bu bilgiyle aynı güne ait mevcut önerinin parçalarından kaçınır.
   */
  regenerate?: boolean;
  /** Kullanıcı belirli bir parçayı sabitlemek isterse */
  pinnedItemIds?: string[];
  notes?: string;
}

export interface OutfitFeedbackPayload {
  outfitId: string;
  feedback: Exclude<OutfitFeedback, null>;
  reason?: DislikeReason;
}

export type DislikeReason =
  'colors' | 'style' | 'weather' | 'occasion' | 'repetitive' | 'other';

export interface HistoryFilters {
  occasion?: Occasion | 'all';
  from?: string;
  to?: string;
  onlyWorn?: boolean;
}

/** İleride haftalık planlama için hazır yapı */
export interface OutfitPlanEntry {
  date: string;
  outfitId?: string;
  occasion: Occasion;
}
