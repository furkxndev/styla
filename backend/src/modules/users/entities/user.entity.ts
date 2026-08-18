import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type {
  Gender,
  NotificationSettings,
  StylePreferences,
  UserLocationSettings,
  UserRole,
} from '../../../common/types/domain.types';

/** Yeni kullanıcı için makul başlangıç tercihleri (onboarding sonrası güncellenir). */
export const DEFAULT_STYLE_PREFERENCES: StylePreferences = {
  favoriteStyles: [],
  avoidedColors: [],
  temperatureSensitivity: 'neutral',
  frequentOccasions: ['daily'],
  defaultFormality: 3,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  dailyOutfitEnabled: true,
  dailyOutfitTime: '08:00',
  weatherAlertsEnabled: true,
  wearReminderEnabled: false,
  pushToken: null,
  timezone: null,
  lastNotifiedDate: null,
};

export const DEFAULT_LOCATION_SETTINGS: UserLocationSettings = {
  useDeviceLocation: true,
};

/** jsonb kolonlarında DB seviyesinde geçerli bir varsayılan üretmek için. */
const jsonbDefault = (value: unknown) => () => `'${JSON.stringify(value)}'::jsonb`;

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  /** Asla API'ye dönmez — user.mapper.ts tarafından filtrelenir. */
  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 120 })
  fullName!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'unspecified' })
  gender!: Gender;

  /**
   * Yetki seviyesi. Enum yerine varchar: yeni rol eklemek DB tipi değiştirmeyi
   * gerektirmesin ve mevcut satırlar synchronize sırasında default'u alsın.
   */
  @Column({ type: 'varchar', length: 16, default: 'user' })
  role!: UserRole;

  /** Pasife alınan kullanıcı giriş yapamaz ve mevcut oturumu reddedilir. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', nullable: true })
  birthYear!: number | null;

  @Column({ type: 'jsonb', default: jsonbDefault(DEFAULT_STYLE_PREFERENCES) })
  preferences!: StylePreferences;

  @Column({ type: 'jsonb', default: jsonbDefault(DEFAULT_NOTIFICATION_SETTINGS) })
  notifications!: NotificationSettings;

  @Column({ type: 'jsonb', default: jsonbDefault(DEFAULT_LOCATION_SETTINGS) })
  location!: UserLocationSettings;

  @Column({ type: 'boolean', default: false })
  onboardingCompleted!: boolean;

  /** Refresh token rotasyonu için tutulur; asla API'ye dönmez. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
