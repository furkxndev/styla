import type { UserResponse } from '../../../common/types/domain.types';
import {
  DEFAULT_LOCATION_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_STYLE_PREFERENCES,
  User,
} from '../entities/user.entity';

/**
 * Entity -> API sözleşmesi.
 * passwordHash ve refreshTokenHash burada bilinçli olarak dışarıda bırakılır;
 * bu fonksiyon dışında kullanıcı nesnesi doğrudan response'a yazılmamalıdır.
 */
export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    // Eski satırlar synchronize öncesinden NULL gelebilir; güvenli tarafa düşülür.
    role: user.role ?? 'user',
    isActive: user.isActive ?? true,
    avatarUrl: user.avatarUrl ?? null,
    gender: user.gender,
    birthYear: user.birthYear ?? undefined,
    preferences: user.preferences ?? DEFAULT_STYLE_PREFERENCES,
    notifications: user.notifications ?? DEFAULT_NOTIFICATION_SETTINGS,
    location: user.location ?? DEFAULT_LOCATION_SETTINGS,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt.toISOString(),
  };
}
