import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IsNull,
  MoreThanOrEqual,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import type {
  AdminOverview,
  AdminUserListResponse,
  AdminUserSummary,
  AiModelOption,
  AiUsageSummary,
  AppSettings,
  UserRole,
} from '../../common/types/domain.types';
import { AiUsageService } from '../ai/ai-usage.service';
import { AI_PROVIDER } from '../ai/interfaces/ai-provider.interface';
import type { AiProvider } from '../ai/interfaces/ai-provider.interface';
import { ChatMessage } from '../assistant/entities/chat-message.entity';
import { Outfit } from '../outfits/entities/outfit.entity';
import { UpdateSettingsDto } from '../settings/dto/update-settings.dto';
import { SettingsService } from '../settings/settings.service';
import { User } from '../users/entities/user.entity';
import { ClothingItem } from '../wardrobe/entities/clothing-item.entity';
import {
  ADMIN_USERS_DEFAULT_PAGE_SIZE,
  ADMIN_USERS_MAX_PAGE_SIZE,
  ListUsersQueryDto,
} from './dto/list-users-query.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

/** Kullanıcı satırının yanında dönen toplu sayımlar (COUNT bigint → metin gelir). */
interface UserAggregatesRaw {
  wardrobeCount: string | number | null;
  outfitCount: string | number | null;
  lastOutfitAt: Date | string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toCount = (value: string | number | null): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoOrNull = (value: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * LIKE joker karakterlerini etkisizleştirir.
 * Aksi halde "%" araması tüm kullanıcıları, "_" ise rastgele eşleşme getirir.
 */
const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * Admin paneli servisleri.
 *
 * İki tasarım kararı burada kritik:
 * 1) Kullanıcı listesi tek sorguda üretilir (korele alt sorgular) — kullanıcı
 *    başına ayrı sayım sorgusu atılmaz.
 * 2) Kendini kilitleme koruması servis katmanındadır; controller ya da guard
 *    değişse bile son yöneticinin yetkisi düşürülemez.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(ClothingItem)
    private readonly items: Repository<ClothingItem>,
    @InjectRepository(Outfit)
    private readonly outfits: Repository<Outfit>,
    @InjectRepository(ChatMessage)
    private readonly chatMessages: Repository<ChatMessage>,
    private readonly aiUsage: AiUsageService,
    private readonly settings: SettingsService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
  ) {}

  /* ------------------------------------------------------------- genel bakış */

  async getOverview(): Promise<AdminOverview> {
    const since = new Date(Date.now() - 7 * MS_PER_DAY);

    // Sayımlar birbirinden bağımsız; sıralı beklemek yerine paralel çalıştırılır.
    const [
      totalUsers,
      activeUsers,
      admins,
      newLast7Days,
      wardrobeItems,
      outfits,
      wornOutfits,
      chatMessages,
      ai,
      settings,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { isActive: true } }),
      this.users.count({ where: { role: 'admin' } }),
      this.users.count({ where: { createdAt: MoreThanOrEqual(since) } }),
      this.items.count(),
      this.outfits.count(),
      // "Giyildi" ölçütü wornAt alanıdır (WardrobeStats ile aynı tanım).
      this.outfits.count({ where: { wornAt: Not(IsNull()) } }),
      this.chatMessages.count(),
      this.aiUsage.summary(),
      this.settings.get(),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, admins, newLast7Days },
      content: { wardrobeItems, outfits, wornOutfits, chatMessages },
      ai,
      settings,
    };
  }

  /* --------------------------------------------------------------- kullanıcı */

  async listUsers(query: ListUsersQueryDto): Promise<AdminUserListResponse> {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const pageSize = Math.min(
      Math.max(1, Math.trunc(query.pageSize ?? ADMIN_USERS_DEFAULT_PAGE_SIZE)),
      ADMIN_USERS_MAX_PAGE_SIZE,
    );

    const total = await this.applyUserFilters(
      this.users.createQueryBuilder('u'),
      query,
    ).getCount();

    if (total === 0) {
      return { data: [], page, pageSize, total: 0, hasMore: false };
    }

    const dataQuery = this.applyUserFilters(this.buildSummaryQuery(), query)
      .orderBy('u.createdAt', 'DESC')
      // Aynı saniyede oluşan kayıtlarda sayfalamanın kaymaması için ikincil sıra.
      .addOrderBy('u.id', 'DESC')
      // Join yok; satır sayısı = kullanıcı sayısı olduğu için doğrudan LIMIT/OFFSET.
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const { entities, raw } =
      await dataQuery.getRawAndEntities<UserAggregatesRaw>();

    return {
      data: entities.map((user, index) => toAdminUserSummary(user, raw[index])),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  async getUser(id: string): Promise<AdminUserSummary> {
    const { entities, raw } = await this.buildSummaryQuery()
      .where('u.id = :id', { id })
      .getRawAndEntities<UserAggregatesRaw>();

    if (entities.length === 0)
      throw new NotFoundException('Kullanıcı bulunamadı');
    return toAdminUserSummary(entities[0], raw[0]);
  }

  async updateUser(
    actorId: string,
    targetId: string,
    dto: UpdateUserAdminDto,
  ): Promise<AdminUserSummary> {
    const target = await this.users.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı');

    const nextRole = dto.role ?? target.role;
    const nextIsActive = dto.isActive ?? target.isActive;

    // Yönetici kendini panelden dışarı atamaz.
    if (target.id === actorId) {
      if (nextRole !== 'admin') {
        throw new BadRequestException('Kendi yönetici yetkini kaldıramazsın');
      }
      if (!nextIsActive) {
        throw new BadRequestException('Kendi hesabını devre dışı bırakamazsın');
      }
    }

    if (
      await this.wouldLeaveSystemWithoutAdmin(target, nextRole, nextIsActive)
    ) {
      throw new BadRequestException('Sistemde en az bir yönetici kalmalı');
    }

    // Pasife alınan hesabın açık oturumu da düşmeli: refresh token geçersiz kılınır.
    // (Access token'lar zaten JwtStrategy'deki aktiflik kontrolüyle reddedilir.)
    if (target.isActive && !nextIsActive) {
      target.refreshTokenHash = null;
    }

    target.role = nextRole;
    target.isActive = nextIsActive;
    await this.users.save(target);

    return this.getUser(target.id);
  }

  async deleteUser(actorId: string, targetId: string): Promise<void> {
    const target = await this.users.findOne({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı');

    if (target.id === actorId) {
      throw new BadRequestException('Kendi hesabını silemezsin');
    }

    // Silinen kullanıcı artık yönetici sayılmaz → nextRole 'user', nextIsActive false.
    if (await this.wouldLeaveSystemWithoutAdmin(target, 'user', false)) {
      throw new BadRequestException('Sistemde en az bir yönetici kalmalı');
    }

    // clothing_items / outfits / chat_messages FK'ları onDelete: CASCADE tanımlı
    // (outfit_items da outfits üzerinden zincirleme siliniyor) → ek temizlik yok.
    await this.users.delete(target.id);
  }

  /* ------------------------------------------------------------------ ayarlar */

  getSettings(): Promise<AppSettings> {
    return this.settings.get();
  }

  updateSettings(
    dto: UpdateSettingsDto,
    actorId: string,
  ): Promise<AppSettings> {
    return this.settings.update(dto, actorId);
  }

  /* ----------------------------------------------------------------------- ai */

  listModels(): Promise<AiModelOption[]> {
    return this.aiProvider.listModels();
  }

  getUsage(): Promise<AiUsageSummary> {
    return this.aiUsage.summary();
  }

  /* --------------------------------------------------------------- yardımcılar */

  /**
   * Kullanıcı + sayımlarını tek sorguda getiren temel sorgu.
   * Sayımlar korele alt sorgudur: satır başına ek gidiş-dönüş yoktur.
   */
  private buildSummaryQuery(): SelectQueryBuilder<User> {
    return this.users
      .createQueryBuilder('u')
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from(ClothingItem, 'ci')
            .where('ci."userId" = u.id'),
        'wardrobeCount',
      )
      .addSelect(
        (sub) =>
          sub.select('COUNT(*)').from(Outfit, 'o').where('o."userId" = u.id'),
        'outfitCount',
      )
      .addSelect(
        (sub) =>
          sub
            .select('MAX(o2."createdAt")')
            .from(Outfit, 'o2')
            .where('o2."userId" = u.id'),
        'lastOutfitAt',
      );
  }

  private applyUserFilters(
    qb: SelectQueryBuilder<User>,
    query: ListUsersQueryDto,
  ): SelectQueryBuilder<User> {
    const search = query.search?.trim();
    if (search) {
      qb.andWhere('(u.email ILIKE :search OR u.fullName ILIKE :search)', {
        search: `%${escapeLikePattern(search)}%`,
      });
    }
    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('u.isActive = :isActive', { isActive: query.isActive });
    }
    return qb;
  }

  /**
   * Değişiklik uygulandığında sistemde giriş yapabilecek hiç yönetici
   * kalmıyorsa true döner. Pasif yönetici giriş yapamayacağı için "yönetici"
   * sayımı aktiflik şartıyla yapılır.
   */
  private async wouldLeaveSystemWithoutAdmin(
    target: User,
    nextRole: UserRole,
    nextIsActive: boolean,
  ): Promise<boolean> {
    const wasUsableAdmin = target.role === 'admin' && target.isActive;
    if (!wasUsableAdmin) return false;
    if (nextRole === 'admin' && nextIsActive) return false;

    const remaining = await this.users.count({
      where: { role: 'admin', isActive: true, id: Not(target.id) },
    });
    return remaining === 0;
  }
}

const toAdminUserSummary = (
  user: User,
  aggregates: UserAggregatesRaw | undefined,
): AdminUserSummary => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
  onboardingCompleted: user.onboardingCompleted,
  createdAt: user.createdAt.toISOString(),
  wardrobeCount: toCount(aggregates?.wardrobeCount ?? 0),
  outfitCount: toCount(aggregates?.outfitCount ?? 0),
  lastOutfitAt: toIsoOrNull(aggregates?.lastOutfitAt ?? null),
});
