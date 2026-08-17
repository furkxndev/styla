import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AppSettings } from '../../common/types/domain.types';
import { AppSetting, DEFAULT_SETTINGS_ID } from './entities/app-setting.entity';
import type { UpdateSettingsDto } from './dto/update-settings.dto';

/**
 * Ayarlar her AI çağrısında okunuyor; DB'ye her seferinde gitmemek için
 * kısa ömürlü bellek önbelleği tutulur. 60 sn, yöneticinin değişikliği
 * "anında" hissettirecek kadar kısa (üstelik update() önbelleği zaten siler).
 */
const CACHE_TTL_MS = 60_000;

/** DB'de satır yokken kullanılacak, env'den türetilmeyen sabit varsayılanlar. */
const FALLBACK_MODEL = 'anthropic/claude-sonnet-4.5';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_WARDROBE_ITEMS = 150;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  private cache: AppSettings | null = null;
  private cacheExpiresAt = 0;

  /**
   * Aynı anda gelen isteklerin hepsinin DB'ye gitmesini (ve tohumlama
   * yarışına girmesini) engeller; ilk istek yüklerken diğerleri onu bekler.
   */
  private inFlight: Promise<AppSettings> | null = null;

  constructor(
    @InjectRepository(AppSetting)
    private readonly repository: Repository<AppSetting>,
    private readonly config: ConfigService,
  ) {}

  async get(): Promise<AppSettings> {
    const cached = this.getCached();
    if (cached) return cached;

    if (this.inFlight) return this.inFlight;

    this.inFlight = this.loadFromDatabase().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  /**
   * Senkron erişim: önbellek taze değilse null döner. Çağıran taraf
   * kendi varsayılanına düşebilsin diye bilerek DB'ye gitmez.
   */
  getCached(): AppSettings | null {
    if (this.cache && Date.now() < this.cacheExpiresAt) return this.cache;
    return null;
  }

  async update(patch: UpdateSettingsDto, updatedBy: string): Promise<AppSettings> {
    // Satır yoksa önce tohumla; aksi halde kısmi güncelleme boşa düşer.
    await this.get();

    const row = await this.repository.findOne({ where: { id: DEFAULT_SETTINGS_ID } });
    if (!row) {
      // Tohumlamadan hemen sonra satırın kaybolması yalnızca elle müdahaleyle olur.
      throw new Error('Sistem ayarları kaydı bulunamadı');
    }

    // undefined gelen alanlar korunur; false/0 gibi anlamlı değerler ezilebilsin diye
    // yayma yerine alan alan kontrol edilir.
    if (patch.aiModel !== undefined) row.aiModel = patch.aiModel;
    if (patch.aiVisionModel !== undefined) row.aiVisionModel = patch.aiVisionModel;
    if (patch.aiTemperature !== undefined) row.aiTemperature = patch.aiTemperature;
    if (patch.maxWardrobeItemsPerPrompt !== undefined) {
      row.maxWardrobeItemsPerPrompt = patch.maxWardrobeItemsPerPrompt;
    }
    if (patch.registrationEnabled !== undefined) row.registrationEnabled = patch.registrationEnabled;
    if (patch.aiFeaturesEnabled !== undefined) row.aiFeaturesEnabled = patch.aiFeaturesEnabled;
    row.updatedBy = updatedBy;

    const saved = await this.repository.save(row);

    // Yönetici değişikliği bir sonraki istekte görülmeli — TTL beklenmez.
    this.invalidate();
    const settings = this.toAppSettings(saved);
    this.putCache(settings);

    this.logger.log(`Sistem ayarları güncellendi (updatedBy=${updatedBy})`);
    return settings;
  }

  async isAiEnabled(): Promise<boolean> {
    const settings = await this.get();
    return settings.aiFeaturesEnabled;
  }

  async isRegistrationEnabled(): Promise<boolean> {
    const settings = await this.get();
    return settings.registrationEnabled;
  }

  /** Önbelleği anında geçersiz kılar. */
  private invalidate(): void {
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  private putCache(settings: AppSettings): void {
    this.cache = settings;
    this.cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  }

  private async loadFromDatabase(): Promise<AppSettings> {
    let row = await this.repository.findOne({ where: { id: DEFAULT_SETTINGS_ID } });

    if (!row) {
      row = await this.seed();
    }

    const settings = this.toAppSettings(row);
    this.putCache(settings);
    return settings;
  }

  /**
   * İlk açılışta env değerlerinden tek satırı oluşturur. Birden fazla instance
   * aynı anda başlarsa çakışma yaşanmasın diye orIgnore ile eklenir ve
   * sonuç DB'den okunur.
   */
  private async seed(): Promise<AppSetting> {
    const model = this.config.get<string>('ai.openRouter.model') ?? FALLBACK_MODEL;
    const visionModel = this.config.get<string>('ai.openRouter.visionModel') ?? model;

    await this.repository
      .createQueryBuilder()
      .insert()
      .into(AppSetting)
      .values({
        id: DEFAULT_SETTINGS_ID,
        aiModel: model,
        aiVisionModel: visionModel,
        aiTemperature: DEFAULT_TEMPERATURE,
        maxWardrobeItemsPerPrompt: DEFAULT_MAX_WARDROBE_ITEMS,
        registrationEnabled: true,
        aiFeaturesEnabled: true,
        updatedBy: null,
      })
      .orIgnore()
      .execute();

    const row = await this.repository.findOne({ where: { id: DEFAULT_SETTINGS_ID } });
    if (!row) {
      throw new Error('Sistem ayarları oluşturulamadı');
    }

    this.logger.log('Sistem ayarları env değerlerinden oluşturuldu');
    return row;
  }

  private toAppSettings(row: AppSetting): AppSettings {
    return {
      aiModel: row.aiModel,
      aiVisionModel: row.aiVisionModel,
      // float kolonu bazı sürücülerde string dönebiliyor; sayıya zorlanır.
      aiTemperature: Number(row.aiTemperature),
      maxWardrobeItemsPerPrompt: Number(row.maxWardrobeItemsPerPrompt),
      registrationEnabled: row.registrationEnabled,
      aiFeaturesEnabled: row.aiFeaturesEnabled,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    };
  }
}
