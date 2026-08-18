import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { NotificationSettings } from '../../common/types/domain.types';
import { toDayKey } from '../../common/utils/date.util';
import { DEFAULT_NOTIFICATION_SETTINGS, User } from '../users/entities/user.entity';
import { Outfit } from '../outfits/entities/outfit.entity';
import type { OutfitResponse } from '../../common/types/domain.types';
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

/** Bildirim penceresine giren kullanıcı ve onun yerel gün anahtarı */
interface DueUser {
  user: User;
  dayKey: string;
}

/**
 * Sabah kombini görevi.
 *
 * Kullanıcı uygulamayı açmadan, seçtiği saatte günün kombini hazırlanır ve
 * (push token varsa) bildirim gönderilir. Böylece kombin "o güne özel" olur;
 * uygulamayı her açışta yeniden üretilmez.
 *
 * Bildirim tek kanaldan gider: push token kayıtlıysa buradan, kayıtlı değilse
 * cihazın kendi planladığı yerel bildirimden (bkz. frontend
 * `useDailyNotificationScheduler`). İki kanal aynı anda çalışmaz.
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

  /** Her 15 dakikada bir çalışır; kullanıcının saat dilimine göre eşleşir. */
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
      ? await this.findUsersWithoutTodayOutfit(now)
      : await this.findUsersDueNow(now);

    if (candidates.length === 0) {
      return { candidates: 0, generated: 0, failed: 0, skipped: false };
    }

    this.logger.log(`${candidates.length} kullanıcı için günün kombini hazırlanıyor`);

    let generated = 0;
    let failed = 0;
    for (const candidate of candidates) {
      try {
        await this.deliverFor(candidate);
        generated += 1;
      } catch (error) {
        // Bir kullanıcının hatası diğerlerini etkilemesin
        failed += 1;
        this.logger.warn(
          `Kombin üretilemedi (userId=${candidate.user.id}): ${error instanceof Error ? error.message : 'bilinmeyen hata'}`,
        );
      }
    }
    return { candidates: candidates.length, generated, failed, skipped: false };
  }

  /**
   * Kullanıcının saat dilimindeki "şimdi".
   *
   * Sunucu UTC'de çalışırken kullanıcının seçtiği 07:30'u sunucu saatiyle
   * karşılaştırmak bildirimi saatler öncesine/sonrasına kaydırıyordu.
   */
  private localNow(
    now: Date,
    timezone?: string | null,
  ): { dayKey: string; minutes: number } {
    const fallback = {
      dayKey: toDayKey(now),
      minutes: now.getHours() * 60 + now.getMinutes(),
    };
    if (!timezone) return fallback;

    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);

      const part = (type: string) =>
        parts.find((candidate) => candidate.type === type)?.value ?? '';

      // Bazı ortamlar gece yarısını "24" olarak biçimlendirir
      const hour = Number(part('hour')) % 24;
      const minute = Number(part('minute'));
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;

      return {
        dayKey: `${part('year')}-${part('month')}-${part('day')}`,
        minutes: hour * 60 + minute,
      };
    } catch {
      // Geçersiz saat dilimi: sunucu saatine düşülür
      return fallback;
    }
  }

  /** Bildirimi açık olup bugün için kombini olmayan tüm kullanıcılar (elle çalıştırma) */
  private async findUsersWithoutTodayOutfit(now: Date): Promise<DueUser[]> {
    const users = await this.users.find({ where: { isActive: true } });
    const result: DueUser[] = [];
    for (const user of users) {
      if (!user.notifications?.dailyOutfitEnabled) continue;
      const { dayKey } = this.localNow(now, user.notifications.timezone);
      const existing = await this.outfits.count({
        where: { userId: user.id, date: dayKey },
      });
      if (existing === 0) result.push({ user, dayKey });
    }
    return result;
  }

  /**
   * Bildirim saati son pencereye düşen ve bugün bildirimi henüz gönderilmemiş
   * kullanıcılar.
   *
   * "Bugün kombini zaten var" durumu artık eleme sebebi değil: kullanıcı sabah
   * uygulamayı açıp kombinini ürettiyse bildirim hiç gitmiyordu. Mükerrer
   * bildirimi `lastNotifiedDate` engelliyor.
   */
  private async findUsersDueNow(now: Date): Promise<DueUser[]> {
    const users = await this.users.find({ where: { isActive: true } });

    const due: DueUser[] = [];
    for (const user of users) {
      const settings = user.notifications;
      if (!settings?.dailyOutfitEnabled) continue;

      const [hour, minute] = (settings.dailyOutfitTime ?? '08:00').split(':').map(Number);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

      const { dayKey, minutes: nowMinutes } = this.localNow(now, settings.timezone);
      const diff = nowMinutes - (hour * 60 + minute);
      if (diff < 0 || diff >= WINDOW_MINUTES) continue;

      // Aynı gün ikinci kez bildirim gönderilmez
      if (settings.lastNotifiedDate === dayKey) continue;

      due.push({ user, dayKey });
    }
    return due;
  }

  private async deliverFor({ user, dayKey }: DueUser): Promise<void> {
    // Kullanıcı sabah uygulamayı açıp kombinini zaten ürettiyse yenisi
    // üretilmez; bildirim mevcut kombinle gönderilir.
    const existing = await this.outfitsService.findToday(user.id, dayKey);
    const outfit =
      existing ??
      (await this.outfitsService.generate(user.id, {
        date: dayKey,
        occasion: 'daily',
      }));

    if (!existing) {
      this.logger.log(`Günün kombini hazır (userId=${user.id}, outfitId=${outfit.id})`);
    }

    await this.markNotified(user, dayKey);

    const token = user.notifications?.pushToken;
    // Token yoksa cihaz kendi yerel bildirimini gösteriyor; buradan da
    // göndermek çift bildirim demek olurdu.
    if (!token) return;

    await this.push.send({
      token,
      title: `☀️ Günaydın${user.fullName ? ` ${user.fullName.split(' ')[0]}` : ''}!`,
      body: this.buildBody(outfit),
      data: { screen: 'DailyOutfit', outfitId: outfit.id },
    });
  }

  private buildBody(outfit: OutfitResponse): string {
    const temperature = outfit.weather
      ? `${Math.round(outfit.weather.temperature)}°C`
      : null;
    const pieces = outfit.slots
      .filter((slot) => ['top', 'bottom', 'dress', 'outerwear'].includes(slot.role))
      .map((slot) => slot.item.name.toLocaleLowerCase('tr-TR'))
      .slice(0, 2)
      .join(' + ');

    if (!pieces) {
      return temperature
        ? `Bugün hava ${temperature}. Günün kombini seni bekliyor.`
        : 'Günün kombini seni bekliyor.';
    }

    return temperature
      ? `Bugün hava ${temperature}. Senin için ${pieces} kombinini hazırladık.`
      : `Bugünün kombini hazır: ${pieces}`;
  }

  /** Mükerrer bildirimi engelleyen gün damgası */
  private async markNotified(user: User, dayKey: string): Promise<void> {
    const fresh = await this.users.findOne({ where: { id: user.id } });
    if (!fresh) return;

    const current: NotificationSettings =
      fresh.notifications ?? DEFAULT_NOTIFICATION_SETTINGS;
    fresh.notifications = { ...current, lastNotifiedDate: dayKey };
    await this.users.save(fresh);
  }
}
