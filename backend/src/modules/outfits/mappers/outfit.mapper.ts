import type {
  OutfitResponse,
  OutfitSlotResponse,
} from '../../../common/types/domain.types';
import { toClothingItemResponse } from '../../wardrobe/mappers/clothing-item.mapper';
import type { Outfit } from '../entities/outfit.entity';

/** Outfit entity'sini frontend sözleşmesindeki OutfitResponse'a çevirir. */
export function toOutfitResponse(outfit: Outfit): OutfitResponse {
  const ordered = [...(outfit.items ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  const slots: OutfitSlotResponse[] = [];
  for (const outfitItem of ordered) {
    // Parça silinmişse slot yanıta dahil edilmez
    if (!outfitItem.item) continue;
    slots.push({
      role: outfitItem.role,
      itemId: outfitItem.itemId,
      item: toClothingItemResponse(outfitItem.item),
      reason: outfitItem.reason ?? undefined,
    });
  }

  return {
    id: outfit.id,
    userId: outfit.userId,
    date: outfit.date,
    occasion: outfit.occasion,
    slots,
    summary: outfit.summary,
    stylingTip: outfit.stylingTip ?? undefined,
    score: outfit.score,
    weather: outfit.weather ?? undefined,
    feedback: outfit.feedback ?? null,
    wornAt: outfit.wornAt ? outfit.wornAt.toISOString() : null,
    note: outfit.note ?? undefined,
    photoUrl: outfit.photoUrl ?? undefined,
    isGeneratedByAI: outfit.isGeneratedByAI,
    createdAt: outfit.createdAt.toISOString(),
  };
}
