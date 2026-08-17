import type {
  ChatMessageResponse,
  ClothingItemResponse,
  OutfitResponse,
} from '../../../common/types/domain.types';
import type { ChatMessage } from '../entities/chat-message.entity';

/**
 * Entity → API sözleşmesi dönüşümü.
 * referencedItems, çağıran tarafın hazırladığı id→parça haritasından doldurulur;
 * silinmiş parçalar haritada bulunmaz ve yanıttan sessizce düşer.
 */
export function toChatMessageResponse(
  message: ChatMessage,
  itemsById: Map<string, ClothingItemResponse> = new Map(),
  suggestedOutfit: OutfitResponse | null = null,
): ChatMessageResponse {
  const referencedItems = (message.referencedItemIds ?? [])
    .map((id) => itemsById.get(id))
    .filter((item): item is ClothingItemResponse => item !== undefined);

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    referencedItems: referencedItems.length > 0 ? referencedItems : undefined,
    suggestedOutfit,
  };
}
