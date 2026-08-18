import { config } from '../../constants/config';
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  User,
  WardrobeStats,
} from '../../types/user';
import { mockAuth } from '../mock/mockServer';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';

export const authApi = {
  login: (payload: LoginPayload): Promise<AuthSession> =>
    config.useMockApi
      ? mockAuth.login(payload)
      : apiClient.post<AuthSession>(ENDPOINTS.auth.login, payload, { skipAuth: true }),

  register: (payload: RegisterPayload): Promise<AuthSession> =>
    config.useMockApi
      ? mockAuth.register(payload)
      : apiClient.post<AuthSession>(ENDPOINTS.auth.register, payload, { skipAuth: true }),

  me: (): Promise<User> =>
    config.useMockApi ? mockAuth.me() : apiClient.get<User>(ENDPOINTS.auth.me),

  /** Access token süresi dolduğunda yeni token çifti alır (rotasyonlu). */
  refresh: (refreshToken: string): Promise<AuthSession> =>
    config.useMockApi
      ? mockAuth.login({ email: 'demo@kombin.app', password: 'mockmock' })
      : apiClient.post<AuthSession>(
          ENDPOINTS.auth.refresh,
          { refreshToken },
          { skipAuth: true },
        ),

  logout: (): Promise<void> =>
    config.useMockApi ? mockAuth.logout() : apiClient.post<void>(ENDPOINTS.auth.logout),

  updateProfile: (patch: Partial<User>): Promise<User> =>
    config.useMockApi
      ? mockAuth.updateUser(patch)
      : apiClient.patch<User>(ENDPOINTS.user.update, patch),

  updatePreferences: (preferences: User['preferences']): Promise<User> =>
    config.useMockApi
      ? mockAuth.updateUser({ preferences })
      : apiClient.patch<User>(ENDPOINTS.user.preferences, preferences),

  updateNotifications: (notifications: User['notifications']): Promise<User> =>
    config.useMockApi
      ? mockAuth.updateUser({ notifications })
      : apiClient.patch<User>(ENDPOINTS.user.notifications, notifications),

  registerPushToken: (token: string, timezone?: string | null): Promise<void> =>
    config.useMockApi
      ? Promise.resolve()
      : apiClient.post<void>(ENDPOINTS.user.pushToken, {
          token,
          ...(timezone ? { timezone } : {}),
        }),

  stats: (): Promise<WardrobeStats> =>
    config.useMockApi
      ? mockAuth.stats()
      : apiClient.get<WardrobeStats>(ENDPOINTS.user.stats),
};
