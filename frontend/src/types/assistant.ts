import type { ClothingItem } from './clothing';
import type { Outfit } from './outfit';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** AI cevabında referans verdiği gardırop ürünleri */
  referencedItems?: ClothingItem[];
  /** AI cevabıyla birlikte önerdiği hazır kombin */
  suggestedOutfit?: Outfit | null;
  status?: 'sending' | 'sent' | 'error';
}

export interface AssistantRequest {
  message: string;
  /** Son N mesaj bağlam olarak gönderilir */
  history: Pick<ChatMessage, 'role' | 'content'>[];
  /** Kullanıcı belirli bir ürün üzerinden soruyorsa */
  focusItemId?: string;
}

export interface AssistantResponse {
  message: ChatMessage;
}
