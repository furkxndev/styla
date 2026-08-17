import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { AiFeature } from '../../../common/types/domain.types';

/**
 * Her AI çağrısının maliyet/token kaydı.
 *
 * User ile ilişki (ManyToOne) bilerek kurulmadı: kullanıcı silinse bile
 * harcanan para gerçekleşmiş bir maliyettir ve raporlardan düşmemelidir.
 * Bu yüzden userId salt bir referans olarak tutulur ve nullable'dır.
 */
@Entity('ai_usage_logs')
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Çağrıyı tetikleyen kullanıcı; sistem/arka plan çağrılarında null */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 16 })
  feature: AiFeature;

  /** Sağlayıcının gerçekte kullandığı model kimliği */
  @Column({ type: 'varchar', length: 120 })
  model: string;

  @Column({ type: 'int', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', default: 0 })
  totalTokens: number;

  /** USD. Kuruş altı tutarlar toplandığı için numeric yerine double precision */
  @Column({ type: 'double precision', default: 0 })
  cost: number;

  @Column({ type: 'boolean' })
  success: boolean;

  /** Başarısız çağrılarda hata sınıfının adı; başarılıda null */
  @Column({ type: 'varchar', length: 64, nullable: true })
  errorCode: string | null;

  @Column({ type: 'int' })
  durationMs: number;

  /** Gün/ay bazlı toplamalar bu sütun üzerinden filtrelendiği için indeksli */
  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
