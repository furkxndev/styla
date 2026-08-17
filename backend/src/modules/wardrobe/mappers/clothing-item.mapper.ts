import type {
  ClothingItemResponse,
  Formality,
} from '../../../common/types/domain.types';
import type { AiWardrobeItem } from '../../ai/interfaces/ai.types';
import type { ClothingItem } from '../entities/clothing-item.entity';

/**
 * Entity → API yanıtı. Nullable kolonlar API'de opsiyonel olduğu için
 * null yerine undefined döneriz (lastWornAt hariç; frontend null bekliyor).
 */
export function toClothingItemResponse(item: ClothingItem): ClothingItemResponse {
  return {
    id: item.id,
    userId: item.userId,
    imageUrl: item.imageUrl,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? undefined,
    colors: item.colors ?? [],
    pattern: item.pattern,
    styles: item.styles ?? [],
    seasons: item.seasons ?? [],
    materials: item.materials ?? undefined,
    formality: item.formality as Formality,
    temperatureRange: item.temperatureRange,
    brand: item.brand ?? undefined,
    notes: item.notes ?? undefined,
    isFavorite: item.isFavorite,
    wearCount: item.wearCount,
    lastWornAt: item.lastWornAt ? item.lastWornAt.toISOString() : null,
    aiConfidence: item.aiConfidence ?? undefined,
    isUserEdited: item.isUserEdited,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/**
 * Entity → AI girdisi. Prompt maliyetini düşürmek için görsel/marka gibi
 * karar için gereksiz alanlar dışarıda bırakılır.
 */
export function toAiWardrobeItem(item: ClothingItem): AiWardrobeItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? undefined,
    colors: (item.colors ?? []).map((color) => ({
      name: color.name,
      family: color.family,
    })),
    pattern: item.pattern,
    styles: item.styles ?? [],
    seasons: item.seasons ?? [],
    materials: item.materials ?? undefined,
    formality: item.formality,
    temperatureRange: item.temperatureRange,
    isFavorite: item.isFavorite,
    wearCount: item.wearCount,
    lastWornAt: item.lastWornAt ? item.lastWornAt.toISOString() : null,
  };
}
