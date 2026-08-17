import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { toDayKey } from '../../common/utils/date.util';
import { User } from '../users/entities/user.entity';
import { Outfit } from '../outfits/entities/outfit.entity';
import { OutfitsService } from '../outfits/outfits.service';
import { PushService } from './push.service';

/** Görevin çalışma sıklığı; kullanıcının seçtiği saatle eşleşme penceresi de budur. */
const WINDOW_MINUTES = 15;

export interface DailyOutfitRunResult {
  /** Kombin üretilmesi gereken kullanıcı sayısı */
  candidates: number;
  generated: number;
  failed: number;
  /** Görev yapılandırmadan kapatılmışsa true */
  skipped: boolean;
}

/**
 * Sabah kombini görevi.
 *
 * Kullanıcı uygulamayı açmadan, seçtiği saatte günün kombini hazırlanır ve
 * (push token varsa) bildirim gönderilir. Böylece kombin "o güne özel" olur;
 * uygulamayı her açışta yeniden üretilmez.
 */
@Injectable()
export class DailyOutfitService {
  private readonly logger = new Logger(DailyOutfitService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Outfit) private readonly outfits: Repository<Outfit>,
    private readonly outfitsService: OutfitsService,
    private readonly push: PushService,
    private readonly config: ConfigService,
  ) {}

  /** Her 15 dakikada bir çalışır; sunucu saat dilimi TZ ile ayarlanır. */
  @Cron('0 */15 * * * *')
  async handleDailyOutfits(): Promise<DailyOutfitRunResult> {
    if (!this.config.get<boolean>('scheduler.dailyOutfitEnabled')) {
      return { candidates: 0, generated: 0, failed: 0, skipped: true };
    }
    return this.run();
  }

  /**
   * Görevin gövdesi. Admin panelinden elle de tetiklenebilir
   * (bildirim saatini beklemeden test/çalıştırma için).
   */
  async run(options?: { force?: boolean }): Promise<DailyOutfitRunResult> {
    const now = new Date();
    const candidates = options?.force
      ? await this.findUsersWithoutTodayOutfit()
      : await this.findUsersDueNow(now);

    if (candidates.length === 0) {
      return { candidates: 0, generated: 0, failed: 0, skipped: false };
    }

    this.logger.log(`${candidates.length} kullanıcı için günün kombini hazırlanıyor`);

    let generated = 0;
    let failed = 0;
    for (const user of candidates) {
      try {
        await this.generateFor(user);
        generated += 1;
      } catch (error) {
        // Bir kullanıcının hatası diğerlerini etkilemesin
        failed += 1;
        this.logger.warn(
          `Kombin üretilemedi (userId=${user.id}): ${error instanceof Error ? error.message : 'bilinmeyen hata'}`,
        );
      }
    }
    return { candidates: candidates.length, generated, failed, skipped: false };
  }

  /** Bildirimi açık olup bugün için kombini olmayan tüm kullanıcılar (elle çalıştırma) */
  private async findUsersWithoutTodayOutfit(): Promise<User[]> {
    const users = await this.users.find({ where: { isActive: true } });
    const today = toDayKey();
    const result: User[] = [];
    for (const user of users) {
      if (!user.notifications?.dailyOutfitEnabled) continue;
      const existing = await this.outfits.count({
        where: { userId: user.id, date: today },
      });
      if (existing === 0) result.push(user);
    }
    return result;
  }

  /**
   * Bildirim saati son pencereye düşen, bildirimi açık ve bugün için
   * kombini olmayan kullanıcılar.
   */
  private async findUsersDueNow(now: Date): Promise<User[]> {
    const users = await this.users.find({ where: { isActive: true } });
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const today = toDayKey(now);

    const due: User[] = [];
    for (const user of users) {
      const settings = user.notifications;
      if (!settings?.dailyOutfitEnabled) continue;

      const [hour, minute] = (settings.dailyOutfitTime ?? '08:00').split(':').map(Number);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

      const targetMinutes = hour * 60 + minute;
      const diff = nowMinutes - targetMinutes;
      if (diff < 0 || diff >= WINDOW_MINUTES) continue;

      const existing = await this.outfits.count({ where: { userId: user.id, date: today } });
      if (existing > 0) continue;

      due.push(user);
    }
    return due;
  }

  private async generateFor(user: User): Promise<void> {
    const outfit = await this.outfitsService.generate(user.id, {
      date: toDayKey(),
      occasion: 'daily',
    });

    this.logger.log(`Günün kombini hazır (userId=${user.id}, outfitId=${outfit.id})`);

    const token = user.notifications?.pushToken;
    if (!token) return;

    const temperature = outfit.weather
      ? `${Math.round(outfit.weather.temperature)}°C`
      : null;
    const pieces = outfit.slots
      .filter((slot) => ['top', 'bottom', 'dress', 'outerwear'].includes(slot.role))
      .map((slot) => slot.item.name.toLocaleLowerCase('tr-TR'))
      .slice(0, 2)
      .join(' + ');

    await this.push.send({
      token,
      title: `☀️ Günaydın${user.fullName ? ` ${user.fullName.split(' ')[0]}` : ''}!`,
      body: temperature
        ? `Bugün hava ${temperature}. Senin için ${pieces} kombinini hazırladık.`
        : `Bugünün kombini hazır: ${pieces}`,
      data: { screen: 'DailyOutfit', outfitId: outfit.id },
    });
  }
}
