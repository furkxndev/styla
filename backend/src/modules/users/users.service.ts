import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type {
  NotificationSettings,
  StylePreferences,
  UserRole,
  WardrobeStats,
} from '../../common/types/domain.types';
import { ClothingItem } from '../wardrobe/entities/clothing-item.entity';
import { Outfit } from '../outfits/entities/outfit.entity';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  DEFAULT_LOCATION_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_STYLE_PREFERENCES,
  User,
} from './entities/user.entity';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName: string;
}

/** Yerel gün anahtarı (YYYY-MM-DD) — streak hesabı gün bazında yapılır. */
const toDayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(ClothingItem)
    private readonly items: Repository<ClothingItem>,
    @InjectRepository(Outfit)
    private readonly outfits: Repository<Outfit>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAdminBootstrap();
  }

  /**
   * ADMIN_EMAIL ile eşleşen hesabı admin'e yükseltir.
   * Kullanıcı henüz kayıtlı değilse sessiz geçilir; normal akışta kayıt olduktan
   * sonraki ilk açılışta yetki verilir. Böylece panele erişim için DB'ye elle
   * müdahale gerekmez.
   */
  async ensureAdminBootstrap(): Promise<void> {
    const email = (this.config.get<string>('admin.email') ?? '').trim().toLowerCase();
    if (!email) return;

    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      this.logger.log(`ADMIN_EMAIL (${email}) için kayıt bulunamadı, yetkilendirme atlandı`);
      return;
    }

    if (user.role === 'admin') return;

    await this.users.update({ id: user.id }, { role: 'admin' });
    this.logger.log(`${email} yönetici yetkisine yükseltildi`);
  }

  /** Admin paneli için: rol değiştirme. */
  async setRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.users.save(user);
  }

  /** Admin paneli için: hesabı aktif/pasif yapma. Pasife alınan hesabın
   *  refresh token'ı da düşürülür, aksi halde açık oturumu devam ederdi. */
  async setActive(id: string, isActive: boolean): Promise<User> {
    const user = await this.findById(id);
    user.isActive = isActive;
    if (!isActive) user.refreshTokenHash = null;
    return this.users.save(user);
  }

  async isAdmin(id: string): Promise<boolean> {
    const user = await this.users.findOne({ where: { id }, select: { id: true, role: true } });
    return user?.role === 'admin';
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return user;
  }

  /** Auth akışı için — passwordHash dahil döner, bulunamazsa null. */
  async findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.users.create({
      email: data.email.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      fullName: data.fullName.trim(),
      avatarUrl: null,
      gender: 'unspecified',
      birthYear: null,
      role: 'user',
      isActive: true,
      preferences: { ...DEFAULT_STYLE_PREFERENCES },
      notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
      location: { ...DEFAULT_LOCATION_SETTINGS },
      onboardingCompleted: false,
      refreshTokenHash: null,
    });

    return this.users.save(user);
  }

  async update(id: string, patch: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (patch.fullName !== undefined) user.fullName = patch.fullName.trim();
    if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
    if (patch.gender !== undefined) user.gender = patch.gender;
    if (patch.birthYear !== undefined) user.birthYear = patch.birthYear;
    if (patch.onboardingCompleted !== undefined) {
      user.onboardingCompleted = patch.onboardingCompleted;
    }
    // Konum ayarı bütün olarak gelir; kısmi birleştirme yanlış konum üretebilir.
    if (patch.location !== undefined) user.location = { ...patch.location };

    return this.users.save(user);
  }

  /** Kısmi gelen tercihler mevcutlarla birleştirilir. */
  async updatePreferences(id: string, patch: UpdatePreferencesDto): Promise<User> {
    const user = await this.findById(id);
    const current: StylePreferences = user.preferences ?? DEFAULT_STYLE_PREFERENCES;

    user.preferences = { ...current, ...patch };
    return this.users.save(user);
  }

  async updateNotifications(id: string, patch: UpdateNotificationsDto): Promise<User> {
    const user = await this.findById(id);
    const current: NotificationSettings = user.notifications ?? DEFAULT_NOTIFICATION_SETTINGS;

    user.notifications = { ...current, ...patch };
    return this.users.save(user);
  }

  async updatePushToken(id: string, token: string): Promise<void> {
    const user = await this.findById(id);
    const current: NotificationSettings = user.notifications ?? DEFAULT_NOTIFICATION_SETTINGS;

    user.notifications = { ...current, pushToken: token };
    await this.users.save(user);
  }

  /** null geçilirse oturum kapatılmış olur (refresh artık kullanılamaz). */
  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.users.update({ id }, { refreshTokenHash: hash });
  }

  async getStats(userId: string): Promise<WardrobeStats> {
    const [items, outfits] = await Promise.all([
      this.items.find({ where: { userId } }),
      this.outfits.find({ where: { userId } }),
    ]);

    const byCategory: Record<string, number> = {};
    let neverWornCount = 0;
    let mostWornItemId: string | undefined;
    let mostWornCount = 0;

    for (const item of items) {
      byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;

      const wearCount = item.wearCount ?? 0;
      if (wearCount === 0) neverWornCount += 1;
      if (wearCount > mostWornCount) {
        mostWornCount = wearCount;
        mostWornItemId = item.id;
      }
    }

    const wornDates = outfits
      .map((outfit) => outfit.wornAt)
      .filter((value): value is Date => Boolean(value))
      .map((value) => new Date(value));

    return {
      totalItems: items.length,
      byCategory,
      totalOutfits: outfits.length,
      wornOutfits: wornDates.length,
      mostWornItemId,
      neverWornCount,
      streakDays: this.calculateStreakDays(wornDates),
    };
  }

  /**
   * Bugünden (ya da bugün giyim yoksa dünden) geriye doğru kesintisiz gün serisi.
   * Aynı güne düşen birden fazla kombin tek gün sayılır.
   */
  private calculateStreakDays(wornDates: Date[]): number {
    if (wornDates.length === 0) return 0;

    const days = new Set(wornDates.map(toDayKey));
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    // Bugün henüz kombin giyilmediyse seri dünden başlar; bu seriyi bozmaz.
    if (!days.has(toDayKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (days.has(toDayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }
}
