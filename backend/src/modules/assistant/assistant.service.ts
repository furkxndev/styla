import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  ChatMessageResponse,
  ClothingItemResponse,
  OutfitResponse,
} from '../../common/types/domain.types';
import { AiService } from '../ai/ai.service';
import type { AiAssistantAnswer } from '../ai/interfaces/ai.types';
import { OutfitsService } from '../outfits/outfits.service';
import { UsersService } from '../users/users.service';
import { WardrobeService } from '../wardrobe/wardrobe.service';
import {
  toAiWardrobeItem,
  toClothingItemResponse,
} from '../wardrobe/mappers/clothing-item.mapper';
import { WeatherService } from '../weather/weather.service';
import { ChatDto } from './dto/chat.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { toChatMessageResponse } from './mappers/chat-message.mapper';

/** Sohbet geçmişinde tutulan/döndürülen üst sınır */
const THREAD_LIMIT = 100;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messages: Repository<ChatMessage>,
    private readonly wardrobeService: WardrobeService,
    private readonly weatherService: WeatherService,
    private readonly usersService: UsersService,
    private readonly outfitsService: OutfitsService,
    private readonly aiService: AiService,
  ) {}

  async chat(userId: string, dto: ChatDto): Promise<ChatMessageResponse> {
    const user = await this.usersService.findById(userId);
    const items = await this.wardrobeService.findAllByUser(userId);
    const weather = await this.weatherService.getForUserLocation(user.location);

    const answer: AiAssistantAnswer = await this.aiService.answerStyleQuestion({
      userId,
      question: dto.message,
      history: (dto.history ?? []).map((h) => ({ role: h.role, content: h.content })),
      wardrobe: items.map(toAiWardrobeItem),
      weather,
      preferences: user.preferences,
      focusItemId: dto.focusItemId,
    });

    // Halüsinasyon koruması: AI'ın verdiği id'lerden yalnızca gerçekten
    // gardıropta olanlar saklanır. Öneri slotlarındaki parçalar da atıf sayılır.
    const ownedIds = new Set(items.map((item) => item.id));
    const candidateIds = [
      ...answer.referencedItemIds,
      ...(answer.suggestedOutfit?.slots ?? []).map((slot) => slot.itemId),
    ];
    const referencedItemIds = [...new Set(candidateIds.filter((id) => ownedIds.has(id)))];

    // AI hazır bir kombin önerdiyse kalıcılaştırılır; böylece kullanıcı
    // sohbetten "Bu kombini görüntüle" ile kombin ekranına geçebilir.
    let suggestedOutfit: OutfitResponse | null = null;
    if (answer.suggestedOutfit) {
      suggestedOutfit = await this.outfitsService
        .createFromSuggestion(userId, answer.suggestedOutfit, { weather })
        .catch((error: unknown) => {
          this.logger.warn(`Önerilen kombin kaydedilemedi: ${String(error)}`);
          return null;
        });
    }

    // Soru ve cevap birlikte kaydedilir: AI çağrısı başarısız olduğunda
    // geçmişte cevapsız bir kullanıcı mesajı kalmaz.
    await this.messages.save(
      this.messages.create({
        userId,
        role: 'user',
        content: dto.message,
        referencedItemIds: null,
        suggestedOutfitId: null,
      }),
    );

    const saved = await this.messages.save(
      this.messages.create({
        userId,
        role: 'assistant',
        content: answer.message,
        referencedItemIds: referencedItemIds.length > 0 ? referencedItemIds : null,
        suggestedOutfitId: suggestedOutfit?.id ?? null,
      }),
    );

    const itemsById = new Map<string, ClothingItemResponse>(
      items
        .filter((item) => referencedItemIds.includes(item.id))
        .map((item) => [item.id, toClothingItemResponse(item)]),
    );

    return toChatMessageResponse(saved, itemsById, suggestedOutfit);
  }

  async getThread(userId: string): Promise<ChatMessageResponse[]> {
    // Son N mesajı alıp kronolojik sıraya çeviriyoruz.
    const recent = await this.messages.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: THREAD_LIMIT,
    });
    const thread = recent.reverse();

    const referencedIds = [
      ...new Set(thread.flatMap((message) => message.referencedItemIds ?? [])),
    ];
    const itemsById = new Map<string, ClothingItemResponse>();
    if (referencedIds.length > 0) {
      const items = await this.wardrobeService.findByIds(userId, referencedIds);
      for (const item of items) {
        itemsById.set(item.id, toClothingItemResponse(item));
      }
    }

    return thread.map((message) => toChatMessageResponse(message, itemsById, null));
  }

  async clearThread(userId: string): Promise<void> {
    await this.messages.delete({ userId });
  }

}
