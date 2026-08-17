import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import type {
  AiFeature,
  AiProviderAccountUsage,
  AiUsageBucket,
  AiUsageSummary,
} from '../../common/types/domain.types';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import type { AiProvider, AiUsage } from './interfaces/ai-provider.interface';

/** record() girdisi — AiService dışındaki modüller de bunu kullanabilir */
export interface AiUsageEntry {
  userId?: string | null;
  feature: AiFeature;
  model: string;
  usage?: AiUsage;
  success: boolean;
  durationMs: number;
  errorCode?: string;
}

/** Grafikte gösterilen pencere */
const SERIES_DAYS = 30;

const ALL_FEATURES: readonly AiFeature[] = ['outfit', 'analysis', 'assistant'];

/**
 * AI maliyet/kullanım defteri.
 *
 * Kayıt tutmak asla ana akışı bozmamalı: record() içindeki her hata yutulur,
 * çünkü bir log satırının yazılamaması yüzünden kullanıcının kombini
 * kaybolmamalıdır.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    @InjectRepository(AiUsageLog)
    private readonly logs: Repository<AiUsageLog>,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async record(entry: AiUsageEntry): Promise<void> {
    try {
      await this.logs.insert({
        userId: entry.userId ?? null,
        feature: entry.feature,
        // Model kimlikleri uzun olabiliyor; sütun sınırına kırpılır
        model: entry.model.slice(0, 120),
        promptTokens: Math.max(0, Math.round(entry.usage?.promptTokens ?? 0)),
        completionTokens: Math.max(
          0,
          Math.round(entry.usage?.completionTokens ?? 0),
        ),
        totalTokens: Math.max(0, Math.round(entry.usage?.totalTokens ?? 0)),
        cost: entry.usage?.cost ?? 0,
        success: entry.success,
        errorCode: entry.errorCode ? entry.errorCode.slice(0, 64) : null,
        durationMs: Math.max(0, Math.round(entry.durationMs)),
      });
    } catch (error) {
      this.logger.warn(
        `AI kullanım kaydı yazılamadı (feature=${entry.feature}): ${
          error instanceof Error ? error.message : 'bilinmeyen hata'
        }`,
      );
    }
  }

  async summary(): Promise<AiUsageSummary> {
    // Gün sınırları sunucunun yerel saatine göre; veritabanı saat diliminden
    // bağımsız olsun diye filtreler JS'te hesaplanmış Date'lerle kurulur.
    const todayStart = startOfLocalDay(new Date());
    const monthStart = startOfLocalMonth(new Date());
    const seriesStart = addDays(todayStart, -(SERIES_DAYS - 1));

    const [today, month, byFeature, dailySeries, provider] = await Promise.all([
      this.bucket(todayStart),
      this.bucket(monthStart),
      this.featureBreakdown(monthStart),
      this.series(seriesStart),
      this.accountUsage(),
    ]);

    return {
      currency: 'USD',
      today,
      month,
      byFeature,
      dailySeries,
      provider,
    };
  }

  /** Verilen andan itibaren toplam maliyet/istek/token */
  private async bucket(from: Date): Promise<AiUsageBucket> {
    const raw = await this.logs
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.cost), 0)', 'cost')
      .addSelect('COUNT(*)', 'requests')
      .addSelect('COALESCE(SUM(log.totalTokens), 0)', 'tokens')
      .where('log.createdAt >= :from', { from })
      .getRawOne<{ cost: string; requests: string; tokens: string }>();

    return {
      cost: toNumber(raw?.cost),
      requests: toNumber(raw?.requests),
      tokens: toNumber(raw?.tokens),
    };
  }

  private async featureBreakdown(
    from: Date,
  ): Promise<AiUsageSummary['byFeature']> {
    const rows = await this.logs
      .createQueryBuilder('log')
      .select('log.feature', 'feature')
      .addSelect('COALESCE(SUM(log.cost), 0)', 'cost')
      .addSelect('COUNT(*)', 'requests')
      .where('log.createdAt >= :from', { from })
      .groupBy('log.feature')
      .getRawMany<{ feature: AiFeature; cost: string; requests: string }>();

    const found = new Map(rows.map((row) => [row.feature, row]));

    // Hiç kullanılmayan özellikler de 0 ile dönsün ki panel grafiği sabit kalsın
    return ALL_FEATURES.map((feature) => ({
      feature,
      cost: toNumber(found.get(feature)?.cost),
      requests: toNumber(found.get(feature)?.requests),
    }));
  }

  /**
   * Son 30 günün günlük serisi. Gruplama SQL yerine JS'te yapılır: gün sınırı
   * veritabanının değil sunucunun yerel takvimine göre belirlenmeli.
   */
  private async series(from: Date): Promise<AiUsageSummary['dailySeries']> {
    const rows = await this.logs.find({
      where: { createdAt: MoreThanOrEqual(from) },
      select: { createdAt: true, cost: true },
    });

    const totals = new Map<string, { cost: number; requests: number }>();
    for (let index = 0; index < SERIES_DAYS; index += 1) {
      totals.set(localDateKey(addDays(from, index)), { cost: 0, requests: 0 });
    }

    for (const row of rows) {
      const bucket = totals.get(localDateKey(new Date(row.createdAt)));
      if (!bucket) continue; // sınırda kalan kayıtlar (saat farkı) atlanır
      bucket.cost += Number(row.cost) || 0;
      bucket.requests += 1;
    }

    return [...totals.entries()].map(([date, value]) => ({
      date,
      cost: value.cost,
      requests: value.requests,
    }));
  }

  /** Sağlayıcı hesabı okunamazsa panel yine açılmalı */
  private async accountUsage(): Promise<AiProviderAccountUsage | null> {
    try {
      return await this.provider.getAccountUsage();
    } catch (error) {
      this.logger.warn(
        `Sağlayıcı hesap kullanımı alınamadı: ${
          error instanceof Error ? error.message : 'bilinmeyen hata'
        }`,
      );
      return null;
    }
  }
}

/* ---------------------------------------------------------- küçük yardımcılar */

/** SUM/COUNT sürücüden string döner */
function toNumber(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Yerel takvime göre YYYY-MM-DD (toISOString UTC'ye kaydırdığı için kullanılmaz) */
function localDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
