import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Tek satırlı ayar tablosu: her zaman DEFAULT_SETTINGS_ID kimliğiyle tek kayıt tutulur.
 * Birden fazla satır olamayacağı için "hangisi geçerli" sorusu hiç doğmaz.
 */
export const DEFAULT_SETTINGS_ID = 'default';

@Entity('app_settings')
export class AppSetting {
  /** Sabit kimlik; upsert'in tek satıra çarpmasını garanti eder. */
  @PrimaryColumn({ type: 'varchar', length: 32 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  aiModel!: string;

  @Column({ type: 'varchar', length: 120 })
  aiVisionModel!: string;

  @Column({ type: 'float' })
  aiTemperature!: number;

  /** AI prompt'una gönderilecek azami parça sayısı — token maliyetinin üst sınırı. */
  @Column({ type: 'int' })
  maxWardrobeItemsPerPrompt!: number;

  @Column({ type: 'boolean', default: true })
  registrationEnabled!: boolean;

  /** Kapalıysa AI uçları devre dışı bırakılır (acil maliyet freni). */
  @Column({ type: 'boolean', default: true })
  aiFeaturesEnabled!: boolean;

  /** Değişikliği yapan yöneticinin kimliği; denetim izi için tutulur. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
