import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  CLOTHING_CATEGORIES,
  COLOR_FAMILIES,
  MATERIALS,
  OUTFIT_SLOT_ROLES,
  PATTERNS,
  SEASONS,
  STYLE_TAGS,
} from '../../common/types/domain.types';
import type {
  AiFeature,
  AppSettings,
  ClothingAnalysisResult,
  ClothingCategory,
  ClothingColor,
  ColorFamily,
  Formality,
  Material,
  OutfitScore,
  OutfitSlotRole,
  Pattern,
  Season,
  StyleTag,
} from '../../common/types/domain.types';
import { SettingsService } from '../settings/settings.service';
import { AiUsageService } from './ai-usage.service';
import { AiResponseFormatException } from './ai.errors';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import type { AiMessage, AiProvider } from './interfaces/ai-provider.interface';
import type {
  AiAssistantAnswer,
  AiOutfitSuggestion,
  AiServiceContract,
  AiWardrobeItem,
  AssistantQuestionInput,
  OutfitGenerationInput,
} from './interfaces/ai.types';
import {
  buildAssistantSystemPrompt,
  buildAssistantUserPrompt,
} from './prompts/assistant.prompt';
import { buildClothingAnalysisPrompt } from './prompts/clothing-analysis.prompt';
import {
  buildOutfitRepairPrompt,
  buildOutfitSystemPrompt,
  buildOutfitUserPrompt,
} from './prompts/outfit.prompt';

/**
 * Uygulamanın AI yüzeyi.
 *
 * Buradaki tek "kontrol" işi şema doğrulamasıdır: modelin döndürdüğü değerlerin
 * sabit listelerde olması ve itemId'lerin kullanıcının gardırobunda gerçekten
 * bulunması. Kombin kararı, gerekçesi ve puanları tamamen modelden gelir.
 */
@Injectable()
export class AiService implements AiServiceContract {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly usage: AiUsageService,
    private readonly settings: SettingsService,
  ) {}

  async analyzeClothingImage(
    imageDataUrl: string,
    userId?: string,
  ): Promise<ClothingAnalysisResult> {
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      throw new BadRequestException('Geçerli bir görsel verisi gönderilmedi.');
    }

    const settings = await this.loadSettings();

    const raw = await this.runImage<unknown>({
      feature: 'analysis',
      userId,
      prompt: buildClothingAnalysisPrompt(),
      imageDataUrl,
      settings,
    });

    return normalizeClothingAnalysis(raw);
  }

  async generateOutfit(
    input: OutfitGenerationInput,
  ): Promise<AiOutfitSuggestion> {
    if (input.wardrobe.length === 0) {
      throw new BadRequestException(
        'Kombin önerebilmem için gardırobunda en az birkaç parça olması gerekiyor.',
      );
    }

    const settings = await this.loadSettings();
    // Prompt maliyeti gardırop büyüklüğüyle doğru orantılı; sınır ayarlardan gelir
    const wardrobe = trimWardrobe(
      input.wardrobe,
      settings.maxWardrobeItemsPerPrompt,
    );
    const trimmedInput: OutfitGenerationInput = { ...input, wardrobe };

    // Modelin göremediği bir parçaya atıf yapması geçersiz sayılmalı
    const allowedIds = new Set(wardrobe.map((item) => item.id));
    const messages: AiMessage[] = [
      { role: 'system', content: buildOutfitSystemPrompt() },
      { role: 'user', content: buildOutfitUserPrompt(trimmedInput) },
    ];

    const first = await this.runJson<unknown>({
      feature: 'outfit',
      userId: input.userId,
      messages,
      settings,
    });
    const firstErrors: string[] = [];
    const suggestion = parseOutfitSuggestion(first, allowedIds, firstErrors);
    if (suggestion) {
      return suggestion;
    }

    // Şema dışı yanıt: hataları modele bildirip TEK bir düzeltme şansı veriyoruz
    this.logger.warn(
      `Kombin yanıtı şemaya uymadı, düzeltme deneniyor: ${firstErrors.join('; ')}`,
    );

    const repairMessages: AiMessage[] = [
      ...messages,
      { role: 'assistant', content: JSON.stringify(first) },
      { role: 'user', content: buildOutfitRepairPrompt(firstErrors) },
    ];

    const second = await this.runJson<unknown>({
      feature: 'outfit',
      userId: input.userId,
      messages: repairMessages,
      settings,
    });
    const secondErrors: string[] = [];
    const repaired = parseOutfitSuggestion(second, allowedIds, secondErrors);
    if (repaired) {
      return repaired;
    }

    throw new AiResponseFormatException(secondErrors.join('; '));
  }

  async answerStyleQuestion(
    input: AssistantQuestionInput,
  ): Promise<AiAssistantAnswer> {
    const settings = await this.loadSettings();
    const wardrobe = trimWardrobe(
      input.wardrobe,
      settings.maxWardrobeItemsPerPrompt,
    );
    const allowedIds = new Set(wardrobe.map((item) => item.id));

    const messages: AiMessage[] = [
      { role: 'system', content: buildAssistantSystemPrompt() },
      ...input.history.map<AiMessage>((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
      {
        role: 'user',
        content: buildAssistantUserPrompt({ ...input, wardrobe }),
      },
    ];

    const raw = await this.runJson<unknown>({
      feature: 'assistant',
      userId: input.userId,
      messages,
      settings,
    });
    const record = asRecord(raw);
    if (!record) {
      throw new AiResponseFormatException('asistan yanıtı nesne değil');
    }

    const message = asNonEmptyString(record.message);
    if (!message) {
      throw new AiResponseFormatException(
        'asistan yanıtında "message" alanı yok',
      );
    }

    // Halüsinasyon koruması: yalnızca gerçekten var olan parçalara atıf bırakılır
    const referencedItemIds = asArray(record.referencedItemIds)
      .map((value) => asNonEmptyString(value))
      .filter(
        (value): value is string => value !== null && allowedIds.has(value),
      );

    const outfitErrors: string[] = [];
    const suggestedOutfit =
      record.suggestedOutfit === null || record.suggestedOutfit === undefined
        ? null
        : parseOutfitSuggestion(
            record.suggestedOutfit,
            allowedIds,
            outfitErrors,
          );

    if (record.suggestedOutfit && !suggestedOutfit) {
      // Sohbeti kesmeye değmez; sadece öneriyi düşürüyoruz
      this.logger.warn(
        `Asistan kombin önerisi şemaya uymadı: ${outfitErrors.join('; ')}`,
      );
    }

    return {
      message,
      referencedItemIds: unique(referencedItemIds),
      suggestedOutfit: suggestedOutfit ?? null,
    };
  }

  /* ------------------------------------------------------- ortak çalıştırıcılar */

  /**
   * Ayarları okur ve acil maliyet frenini uygular.
   * Fren kapalıyken tek bir sağlayıcı çağrısı bile yapılmaz.
   */
  private async loadSettings(): Promise<AppSettings> {
    // Ayarlar veritabanından gelir; geçici bir DB sorunu tüm AI akışını
    // durdurmasın diye önbelleğe, o da yoksa env varsayılanlarına düşülür.
    let settings: AppSettings;
    try {
      settings = await this.settings.get();
    } catch (error) {
      const cached = this.settings.getCached();
      if (!cached) {
        this.logger.error(
          `Ayarlar okunamadı ve önbellek boş: ${String(error)}`,
        );
        throw new ServiceUnavailableException(
          'Sistem ayarları okunamadı, lütfen biraz sonra tekrar dene',
        );
      }
      this.logger.warn('Ayarlar okunamadı, önbellekteki değerlerle devam ediliyor');
      settings = cached;
    }

    if (settings.aiFeaturesEnabled === false) {
      throw new ServiceUnavailableException(
        'Yapay zeka özellikleri yönetici tarafından geçici olarak kapatıldı',
      );
    }
    return settings;
  }

  /** Metin/JSON çağrısı: model ayarlardan gelir, sonuç her hâlükârda defterlenir */
  private async runJson<T>(params: {
    feature: AiFeature;
    userId?: string;
    messages: AiMessage[];
    settings: AppSettings;
  }): Promise<T> {
    const model = params.settings.aiModel;
    const startedAt = Date.now();

    try {
      const result = await this.provider.completeJson<T>(params.messages, {
        json: true,
        model,
        temperature: params.settings.aiTemperature,
      });
      await this.usage.record({
        userId: params.userId ?? null,
        feature: params.feature,
        model: result.model,
        usage: result.usage,
        success: true,
        durationMs: Date.now() - startedAt,
      });
      return result.data;
    } catch (error) {
      // Başarısız çağrı da para/kota harcayabilir; kaydı bırakıp hatayı yükseltiyoruz
      await this.usage.record({
        userId: params.userId ?? null,
        feature: params.feature,
        model,
        success: false,
        durationMs: Date.now() - startedAt,
        errorCode: toErrorCode(error),
      });
      throw error;
    }
  }

  /** Görsel çağrısı: ayrı (ve genelde daha pahalı) vision modelini kullanır */
  private async runImage<T>(params: {
    feature: AiFeature;
    userId?: string;
    prompt: string;
    imageDataUrl: string;
    settings: AppSettings;
  }): Promise<T> {
    const model = params.settings.aiVisionModel;
    const startedAt = Date.now();

    try {
      const result = await this.provider.completeWithImage<T>(
        params.prompt,
        params.imageDataUrl,
        { json: true, model, temperature: params.settings.aiTemperature },
      );
      await this.usage.record({
        userId: params.userId ?? null,
        feature: params.feature,
        model: result.model,
        usage: result.usage,
        success: true,
        durationMs: Date.now() - startedAt,
      });
      return result.data;
    } catch (error) {
      await this.usage.record({
        userId: params.userId ?? null,
        feature: params.feature,
        model,
        success: false,
        durationMs: Date.now() - startedAt,
        errorCode: toErrorCode(error),
      });
      throw error;
    }
  }
}

/**
 * Prompt'a giren parça sayısını sınırlar. Favoriler önce gelir: kullanıcının
 * açıkça işaretlediği parçalar kırpma sırasında ilk düşmemeli.
 */
function trimWardrobe(
  items: AiWardrobeItem[],
  limit: number,
): AiWardrobeItem[] {
  if (!Number.isFinite(limit) || limit <= 0 || items.length <= limit) {
    return items;
  }

  const favorites = items.filter((item) => item.isFavorite);
  const rest = items.filter((item) => !item.isFavorite);
  return [...favorites, ...rest].slice(0, limit);
}

/** Kayda yazılacak kısa hata etiketi; kullanıcı verisi içermez */
function toErrorCode(error: unknown): string {
  if (error instanceof Error) {
    return (error.constructor?.name || error.name || 'Error').slice(0, 64);
  }
  return 'UnknownError';
}

/* ------------------------------------------------------- şema doğrulayıcılar */

function normalizeClothingAnalysis(raw: unknown): ClothingAnalysisResult {
  const record = asRecord(raw);
  if (!record) {
    throw new AiResponseFormatException('kıyafet analizi yanıtı nesne değil');
  }

  const styles = pickMany(record.styles, STYLE_TAGS);
  const seasons = pickMany(record.seasons, SEASONS);
  const materials = pickMany(record.materials, MATERIALS);
  const subcategory = asNonEmptyString(record.subcategory);

  const result: ClothingAnalysisResult = {
    name: asNonEmptyString(record.name) ?? 'İsimsiz parça',
    category: pickOne<ClothingCategory>(
      record.category,
      CLOTHING_CATEGORIES,
      'other',
    ),
    colors: normalizeColors(record.colors),
    pattern: pickOne<Pattern>(record.pattern, PATTERNS, 'other'),
    styles: (styles.length > 0 ? styles : ['casual']) as StyleTag[],
    seasons: (seasons.length > 0 ? seasons : [...SEASONS]) as Season[],
    formality: normalizeFormality(record.formality),
    temperatureRange: normalizeTemperatureRange(record.temperatureRange),
    confidence: clamp(asNumber(record.confidence) ?? 0.5, 0, 1),
  };

  if (subcategory) {
    result.subcategory = subcategory;
  }
  if (materials.length > 0) {
    result.materials = materials as Material[];
  }

  return result;
}

function normalizeColors(raw: unknown): ClothingColor[] {
  const colors = asArray(raw)
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return null;
      const hex = asNonEmptyString(record.hex);
      return {
        name: asNonEmptyString(record.name) ?? 'Renk',
        hex:
          hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : '#808080',
        family: pickOne<ColorFamily>(record.family, COLOR_FAMILIES, 'multi'),
      };
    })
    .filter((color): color is ClothingColor => color !== null);

  return colors.length > 0
    ? colors
    : [{ name: 'Belirsiz', hex: '#808080', family: 'multi' as ColorFamily }];
}

function normalizeFormality(raw: unknown): Formality {
  const value = Math.round(asNumber(raw) ?? 3);
  return clamp(value, 1, 5) as Formality;
}

function normalizeTemperatureRange(raw: unknown): { min: number; max: number } {
  const record = asRecord(raw);
  const min = asNumber(record?.min);
  const max = asNumber(record?.max);
  if (min === null || max === null) {
    return { min: 10, max: 25 };
  }
  return min <= max ? { min, max } : { min: max, max: min };
}

/**
 * Kombin önerisini doğrular. Geçersizse null döner ve nedenleri `errors` içine yazar.
 * Buradaki tek iş şema + itemId varlığı kontrolüdür; puanlama yapılmaz.
 */
function parseOutfitSuggestion(
  raw: unknown,
  allowedIds: ReadonlySet<string>,
  errors: string[],
): AiOutfitSuggestion | null {
  const record = asRecord(raw);
  if (!record) {
    errors.push('yanıt bir JSON nesnesi değil');
    return null;
  }

  const seen = new Set<string>();
  const slots: AiOutfitSuggestion['slots'] = [];

  for (const entry of asArray(record.slots)) {
    const slot = asRecord(entry);
    if (!slot) continue;

    const itemId = asNonEmptyString(slot.itemId);
    const role = asNonEmptyString(slot.role);

    if (!itemId || !allowedIds.has(itemId)) {
      errors.push(`gardıropta olmayan itemId: ${itemId ?? 'boş'}`);
      continue;
    }
    if (!role || !(OUTFIT_SLOT_ROLES as string[]).includes(role)) {
      errors.push(`geçersiz role: ${role ?? 'boş'}`);
      continue;
    }
    if (seen.has(itemId)) {
      errors.push(`aynı parça birden fazla kez kullanılmış: ${itemId}`);
      continue;
    }

    seen.add(itemId);
    const reason = asNonEmptyString(slot.reason);
    slots.push({
      role: role as OutfitSlotRole,
      itemId,
      ...(reason ? { reason } : {}),
    });
  }

  if (slots.length === 0) {
    errors.push('geçerli hiçbir kombin parçası dönmedi');
    return null;
  }

  const summary = asNonEmptyString(record.summary);
  if (!summary) {
    errors.push('"summary" alanı boş');
    return null;
  }

  const stylingTip = asNonEmptyString(record.stylingTip);

  return {
    slots,
    summary,
    ...(stylingTip ? { stylingTip } : {}),
    score: normalizeScore(record.score),
  };
}

/** Puanlar modelden gelir; burada yalnızca 0-100 aralığına kırpılır */
function normalizeScore(raw: unknown): OutfitScore {
  const record = asRecord(raw);
  const read = (key: keyof OutfitScore): number =>
    Math.round(clamp(asNumber(record?.[key]) ?? 0, 0, 100));

  return {
    colorHarmony: read('colorHarmony'),
    styleCoherence: read('styleCoherence'),
    weatherFit: read('weatherFit'),
    personalPreference: read('personalPreference'),
    overall: read('overall'),
  };
}

/* ---------------------------------------------------------- küçük yardımcılar */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Geçersiz değeri en yakınına yuvarlamak yerine güvenli varsayılana çeker */
function pickOne<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const candidate = asNonEmptyString(value);
  return candidate && (allowed as readonly string[]).includes(candidate)
    ? (candidate as T)
    : fallback;
}

function pickMany<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] {
  const picked = asArray(value)
    .map((entry) => asNonEmptyString(entry))
    .filter(
      (entry): entry is string =>
        entry !== null && (allowed as readonly string[]).includes(entry),
    );
  return unique(picked) as T[];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
