import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Outfit } from './entities/outfit.entity';
import { User } from '../users/entities/user.entity';
import { WardrobeService } from '../wardrobe/wardrobe.service';
import { WeatherService } from '../weather/weather.service';
import { AiService } from '../ai/ai.service';
import { toAiWardrobeItem } from '../wardrobe/mappers/clothing-item.mapper';
import { toOutfitResponse } from './mappers/outfit.mapper';
import { GenerateOutfitDto } from './dto/generate-outfit.dto';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { WearOutfitDto } from './dto/wear-outfit.dto';
import { toDayKey, isDayKey } from '../../common/utils/date.util';
import type { ClothingItem } from '../wardrobe/entities/clothing-item.entity';
import type {
  Occasion,
  OutfitResponse,
  WeatherSnapshot,
} from '../../common/types/domain.types';
import type {
  AiFeedbackSignal,
  AiOutfitSuggestion,
} from '../ai/interfaces/ai.types';

/** Geri bildirim geçmişinde AI'a taşınacak kombin sayısı */
const FEEDBACK_HISTORY_SIZE = 20;

/** Tek istekte AI'a gönderilecek azami parça sayısı (maliyet/istek boyutu sınırı) */
const AI_WARDROBE_LIMIT = 150;

@Injectable()
export class OutfitsService {
  private readonly logger = new Logger(OutfitsService.name);

  constructor(
    @InjectRepository(Outfit)
    private readonly outfitRepository: Repository<Outfit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly wardrobeService: WardrobeService,
    private readonly weatherService: WeatherService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Kombini tamamen AI üretir. Backend yalnızca bağlamı toplar ve
   * AI'ın döndürdüğü parça id'lerinin gerçekten kullanıcıya ait olduğunu doğrular.
   */
  async generate(
    userId: string,
    dto: GenerateOutfitDto,
  ): Promise<OutfitResponse> {
    const wardrobe = await this.wardrobeService.findAllByUser(userId);
    if (wardrobe.length === 0) {
      throw new BadRequestException(
        'Kombin oluşturmak için gardırobunda yeterli parça yok',
      );
    }

    const date = dto.date ?? toDayKey();
    const user = await this.userRepository.findOne({ where: { id: userId } });

    // Hava durumu alınamazsa akış durmaz; AI hava bilgisi olmadan da öneri üretir
    const weather =
      dto.weather ??
      (await this.weatherService.getForUserLocation(user?.location));

    const feedbackHistory = await this.buildFeedbackHistory(userId);
    const excludeItemIds = await this.collectExcludedItemIds(
      userId,
      dto.excludeOutfitIds,
    );

    /**
     * Kullanıcı "yeni kombin" dediğinde model kendi en iyi seçimini tekrar
     * etmeye yatkın. O gün hâlihazırda önerilmiş parçaları AI'a "mümkünse
     * tekrar etme" listesi olarak veriyoruz (katı yasak değil: alt giyimi tek
     * olan bir gardıropta üretim tıkanmamalı).
     */
    const avoidRepeatItemIds = dto.regenerate
      ? await this.collectItemIdsForOccasion(userId, date, dto.occasion)
      : undefined;

    const suggestion = await this.aiService.generateOutfit({
      userId,
      date,
      occasion: dto.occasion,
      wardrobe: this.buildAiWardrobe(wardrobe),
      weather,
      preferences: user?.preferences,
      feedbackHistory,
      excludeItemIds,
      avoidRepeatItemIds,
      pinnedItemIds: dto.pinnedItemIds,
      notes: dto.notes,
    });

    // Halüsinasyon koruması: yalnızca gardıropta gerçekten bulunan parçalar kalır
    const ownedIds = new Set(wardrobe.map((item) => item.id));
    const usedIds = new Set<string>();
    const validSlots = suggestion.slots.filter((slot) => {
      if (!ownedIds.has(slot.itemId) || usedIds.has(slot.itemId)) return false;
      usedIds.add(slot.itemId);
      return true;
    });

    if (validSlots.length === 0) {
      this.logger.warn(
        `AI ürettiği parçaların hiçbiri kullanıcının gardırobunda yok (userId=${userId})`,
      );
      throw new UnprocessableEntityException(
        'AI geçerli bir kombin üretemedi, tekrar dene',
      );
    }

    // Aynı gün + AYNI ORTAM için kullanıcının hiç dokunmadığı taslaklar silinir.
    // Ortam bazlı olması önemli: "Günlük" için üretilen kombin, "Spor" üretilince
    // silinmemeli — kullanıcı geri döndüğünde hazır kombini bulmalı.
    // Beğenilen/beğenilmeyen/giyilen kayıtlar (öğrenme sinyalleri) her hâlükârda korunur.
    await this.discardUntouchedDrafts(userId, date, dto.occasion);

    const outfit = this.outfitRepository.create({
      userId,
      date,
      occasion: dto.occasion,
      summary: suggestion.summary,
      stylingTip: suggestion.stylingTip ?? null,
      score: suggestion.score,
      weather: weather ?? null,
      feedback: null,
      feedbackReason: null,
      wornAt: null,
      note: null,
      photoUrl: null,
      isGeneratedByAI: true,
      items: validSlots.map((slot, index) => ({
        itemId: slot.itemId,
        role: slot.role,
        reason: slot.reason ?? null,
        position: index,
      })),
    });

    const saved = await this.outfitRepository.save(outfit);

    // Kayıt sonrası parça ilişkileri eager olarak yeniden yüklenir
    return toOutfitResponse(await this.findOwnedOutfit(userId, saved.id));
  }

  /**
   * Bugüne ait, beğenilmemiş olarak işaretlenmemiş en son kombin.
   *
   * `date` istemciden gelir çünkü kullanıcının cihazı ile sunucu farklı saat
   * diliminde olabilir; kombin kaydı da istemcinin yerel gününe göre yazılır.
   *
   * `occasion` verilirse yalnızca o ortamın kombini döner. İstemci ortam
   * değiştirdiğinde önce buraya bakar: kombin hazırsa AI çağrısı yapılmaz.
   */
  async findToday(
    userId: string,
    date?: string,
    occasion?: Occasion,
  ): Promise<OutfitResponse | null> {
    const dayKey = date && isDayKey(date) ? date : toDayKey();
    const todays = await this.outfitRepository.find({
      where: occasion
        ? { userId, date: dayKey, occasion }
        : { userId, date: dayKey },
      order: { createdAt: 'DESC' },
    });

    const outfit = todays.find(
      (candidate) => candidate.feedback !== 'disliked',
    );
    return outfit ? toOutfitResponse(outfit) : null;
  }

  async findAll(userId: string): Promise<OutfitResponse[]> {
    const outfits = await this.outfitRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return outfits.map(toOutfitResponse);
  }

  async sendFeedback(
    userId: string,
    id: string,
    dto: OutfitFeedbackDto,
  ): Promise<OutfitResponse> {
    const outfit = await this.findOwnedOutfit(userId, id);

    outfit.feedback = dto.feedback;
    outfit.feedbackReason = dto.reason ?? null;

    await this.outfitRepository.save(outfit);
    return toOutfitResponse(outfit);
  }

  /** Kombin giyildi olarak işaretlenir ve parçaların giyim sayacı artar. */
  async markWorn(
    userId: string,
    id: string,
    dto: WearOutfitDto,
  ): Promise<OutfitResponse> {
    const outfit = await this.findOwnedOutfit(userId, id);
    const wornAt = new Date();

    outfit.feedback = 'worn';
    outfit.wornAt = wornAt;
    if (dto.note !== undefined) outfit.note = dto.note;

    await this.outfitRepository.save(outfit);

    const itemIds = (outfit.items ?? []).map((item) => item.itemId);
    if (itemIds.length > 0) {
      await this.wardrobeService.incrementWear(userId, itemIds, wornAt);
    }

    return toOutfitResponse(outfit);
  }

  /**
   * AI asistanının sohbet içinde önerdiği kombini kalıcı hale getirir.
   * Assistant modülü bu metodu kullanır; böylece kombin oluşturma mantığı
   * tek bir yerde (bu serviste) kalır.
   */
  async createFromSuggestion(
    userId: string,
    suggestion: AiOutfitSuggestion,
    context: { occasion?: Occasion; date?: string; weather?: WeatherSnapshot },
  ): Promise<OutfitResponse | null> {
    const ownedIds = new Set(
      (await this.wardrobeService.findAllByUser(userId)).map((item) => item.id),
    );
    const usedIds = new Set<string>();
    const validSlots = suggestion.slots.filter((slot) => {
      if (!ownedIds.has(slot.itemId) || usedIds.has(slot.itemId)) return false;
      usedIds.add(slot.itemId);
      return true;
    });

    if (validSlots.length === 0) return null;

    const outfit = this.outfitRepository.create({
      userId,
      date: context.date ?? toDayKey(),
      occasion: context.occasion ?? 'daily',
      summary: suggestion.summary,
      stylingTip: suggestion.stylingTip ?? null,
      score: suggestion.score,
      weather: context.weather ?? null,
      feedback: null,
      feedbackReason: null,
      wornAt: null,
      note: null,
      photoUrl: null,
      isGeneratedByAI: true,
      items: validSlots.map((slot, index) => ({
        itemId: slot.itemId,
        role: slot.role,
        reason: slot.reason ?? null,
        position: index,
      })),
    });

    const saved = await this.outfitRepository.save(outfit);
    return toOutfitResponse(await this.findOwnedOutfit(userId, saved.id));
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.outfitRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Kombin bulunamadı');
    }
  }

  /* --------------------------------------------------------------- yardımcı */

  /** Yatay yetki açığı olmaması için her erişim userId ile filtrelenir. */
  private async findOwnedOutfit(userId: string, id: string): Promise<Outfit> {
    const outfit = await this.outfitRepository.findOne({
      where: { id, userId },
    });
    if (!outfit) {
      throw new NotFoundException('Kombin bulunamadı');
    }
    return outfit;
  }

  /**
   * AI'a gönderilecek gardırop listesi.
   * Çok büyük gardıroplarda istek boyutu ve maliyet kontrolsüz büyümesin diye
   * en güncel N parça ile sınırlanır (favoriler önceliklidir).
   */
  private buildAiWardrobe(items: ClothingItem[]) {
    if (items.length <= AI_WARDROBE_LIMIT) {
      return items.map(toAiWardrobeItem);
    }

    const sorted = [...items].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    this.logger.warn(
      `Gardırop ${items.length} parça; AI'a ilk ${AI_WARDROBE_LIMIT} parça gönderiliyor`,
    );
    return sorted.slice(0, AI_WARDROBE_LIMIT).map(toAiWardrobeItem);
  }

  /** AI'ın kullanıcıyı tanıması için son geri bildirimli kombinler. */
  private async buildFeedbackHistory(
    userId: string,
  ): Promise<AiFeedbackSignal[]> {
    const recent = await this.outfitRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: FEEDBACK_HISTORY_SIZE,
    });

    const signals: AiFeedbackSignal[] = [];
    for (const outfit of recent) {
      if (!outfit.feedback) continue;
      signals.push({
        outfitDate: outfit.date,
        occasion: outfit.occasion,
        itemIds: (outfit.items ?? []).map((item) => item.itemId),
        feedback: outfit.feedback,
        reason: outfit.feedbackReason ?? undefined,
      });
    }
    return signals;
  }

  /**
   * Bir güne + ortama ait, geri bildirim almamış ve giyilmemiş kombinleri siler.
   * Kullanıcı bir kombine dokunduysa (beğendi/beğenmedi/giydi) kayıt kalır.
   */
  private async discardUntouchedDrafts(
    userId: string,
    date: string,
    occasion: Occasion,
  ): Promise<void> {
    const result = await this.outfitRepository.delete({
      userId,
      date,
      occasion,
      feedback: IsNull(),
      wornAt: IsNull(),
    });
    if (result.affected) {
      this.logger.debug(
        `${result.affected} dokunulmamış taslak kombin temizlendi`,
      );
    }
  }

  /**
   * Aynı gün + aynı ortam için hâlihazırda önerilmiş parçalar.
   * Ortamla sınırlı: "Spor" kombini üretilirken "Günlük" kombinin parçaları
   * dışlanmamalı, yoksa ince gardıroplarda seçenek kalmaz.
   */
  private async collectItemIdsForOccasion(
    userId: string,
    date: string,
    occasion: Occasion,
  ): Promise<string[] | undefined> {
    const outfits = await this.outfitRepository.find({
      where: { userId, date, occasion },
    });

    const ids = new Set<string>();
    for (const outfit of outfits) {
      for (const item of outfit.items ?? []) ids.add(item.itemId);
    }
    return ids.size > 0 ? [...ids] : undefined;
  }

  /** Yeniden öneri istenirken kaçınılacak parçalar. */
  private async collectExcludedItemIds(
    userId: string,
    outfitIds?: string[],
  ): Promise<string[] | undefined> {
    if (!outfitIds || outfitIds.length === 0) return undefined;

    const outfits = await this.outfitRepository.find({
      where: { userId, id: In(outfitIds) },
    });

    const ids = new Set<string>();
    for (const outfit of outfits) {
      for (const item of outfit.items ?? []) ids.add(item.itemId);
    }
    return ids.size > 0 ? [...ids] : undefined;
  }
}
