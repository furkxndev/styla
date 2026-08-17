import type { StyleTag } from '../types/clothing';
import type { DislikeReason, Occasion, Outfit } from '../types/outfit';

/** Duruma göre öne çıkan stil etiketleri */
const OCCASION_STYLE_BIAS: Record<Occasion, StyleTag[]> = {
  daily: ['casual', 'minimal', 'smart_casual'],
  university: ['casual', 'streetwear', 'smart_casual'],
  work: ['formal', 'smart_casual', 'minimal', 'elegant'],
  sport: ['sporty'],
  friends: ['casual', 'streetwear', 'smart_casual'],
  dinner: ['elegant', 'smart_casual', 'minimal'],
  special_event: ['elegant', 'formal'],
  travel: ['casual', 'sporty', 'minimal'],
};

export const getOccasionStyleBias = (occasion: Occasion): StyleTag[] =>
  OCCASION_STYLE_BIAS[occasion] ?? ['casual'];

/**
 * Geri bildirimlerden basit bir tercih profili çıkarır.
 * Backend'deki öğrenme modeli devreye girene kadar arayüzde
 * "AI stilini öğreniyor" göstergesini besler.
 */
export interface LearnedPreferences {
  boostedItemIds: string[];
  penalizedItemIds: string[];
  likedStyles: StyleTag[];
  dislikedReasons: DislikeReason[];
  /** 0-100 arası, AI'ın kullanıcıyı ne kadar tanıdığı */
  learningProgress: number;
}

export const deriveLearnedPreferences = (outfits: Outfit[]): LearnedPreferences => {
  const boosted = new Map<string, number>();
  const penalized = new Map<string, number>();
  const styleCount = new Map<StyleTag, number>();

  outfits.forEach((outfit) => {
    const positive = outfit.feedback === 'liked' || outfit.feedback === 'worn';
    const negative = outfit.feedback === 'disliked';
    if (!positive && !negative) return;

    outfit.slots.forEach((slot) => {
      const target = positive ? boosted : penalized;
      target.set(slot.itemId, (target.get(slot.itemId) ?? 0) + 1);
      if (positive) {
        slot.item.styles.forEach((style) =>
          styleCount.set(style, (styleCount.get(style) ?? 0) + 1),
        );
      }
    });
  });

  const ratedCount = outfits.filter((o) => o.feedback).length;

  return {
    boostedItemIds: [...boosted.entries()]
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id),
    penalizedItemIds: [...penalized.entries()]
      .filter(([id, count]) => count >= 2 && !boosted.has(id))
      .map(([id]) => id),
    likedStyles: [...styleCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([style]) => style),
    dislikedReasons: [],
    learningProgress: Math.min(100, Math.round((ratedCount / 20) * 100)),
  };
};

/** Kombin skoruna göre kullanıcıya gösterilecek etiket */
export const scoreLabel = (score: number) => {
  if (score >= 88) return 'Mükemmel uyum';
  if (score >= 75) return 'Çok iyi uyum';
  if (score >= 62) return 'İyi uyum';
  return 'Denemeye değer';
};
