import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { authApi, setTokenRefresher, setUnauthorizedHandler } from '../services/api';
import { notificationService } from '../services/notifications/notificationService';
import { secureStorage, storage } from '../services/storage';
import { ApiError, type AsyncStatus } from '../types/api';
import type {
  AuthSession,
  LoginPayload,
  NotificationSettings,
  RegisterPayload,
  StylePreferences,
  User,
  UserLocationSettings,
} from '../types/user';

interface AuthState {
  user: User | null;
  status: AsyncStatus;
  error: string | null;
  /** Uygulama açılışında depolanan oturum okundu mu */
  hydrated: boolean;

  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<StylePreferences>) => Promise<void>;
  updateNotifications: (settings: Partial<NotificationSettings>) => Promise<void>;
  registerPushToken: (token: string, timezone: string | null) => Promise<void>;
  updateLocation: (location: Partial<UserLocationSettings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
}

const persistSession = async (session: AuthSession) => {
  await secureStorage.set(STORAGE_KEYS.accessToken, session.tokens.accessToken);
  await secureStorage.set(STORAGE_KEYS.refreshToken, session.tokens.refreshToken);
  await storage.set(STORAGE_KEYS.session, session.user);
};

const clearSession = async () => {
  await secureStorage.remove(STORAGE_KEYS.accessToken);
  await secureStorage.remove(STORAGE_KEYS.refreshToken);
  await storage.remove(STORAGE_KEYS.session);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  error: null,
  hydrated: false,

  async hydrate() {
    try {
      const token = await secureStorage.get(STORAGE_KEYS.accessToken);
      const cachedUser = await storage.get<User>(STORAGE_KEYS.session);

      if (token && cachedUser) {
        set({ user: cachedUser, status: 'success' });
        // Arka planda tazele; hata olursa önbellekteki kullanıcı korunur
        authApi
          .me()
          .then((user) => {
            set({ user });
            storage.set(STORAGE_KEYS.session, user);
          })
          .catch(() => undefined);
      }
    } finally {
      set({ hydrated: true });
    }
  },

  async login(payload) {
    set({ status: 'loading', error: null });
    try {
      const session = await authApi.login(payload);
      await persistSession(session);
      set({ user: session.user, status: 'success' });
      return true;
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof ApiError ? error.message : 'Giriş yapılamadı.',
      });
      return false;
    }
  },

  async register(payload) {
    set({ status: 'loading', error: null });
    try {
      const session = await authApi.register(payload);
      await persistSession(session);
      set({ user: session.user, status: 'success' });
      return true;
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof ApiError ? error.message : 'Kayıt oluşturulamadı.',
      });
      return false;
    }
  },

  async logout() {
    // Çıkıştan sonra bu cihaza bildirim gitmemeli: sunucudaki push token
    // düşürülür, cihazdaki planlı bildirim iptal edilir.
    const notifications = get().user?.notifications;
    if (notifications?.pushToken) {
      await authApi
        .updateNotifications({ ...notifications, pushToken: null })
        .catch(() => undefined);
    }
    await notificationService.cancelDailyOutfit().catch(() => undefined);

    await authApi.logout().catch(() => undefined);
    await clearSession();
    set({ user: null, status: 'idle', error: null });
  },

  async updateProfile(patch) {
    const previous = get().user;
    if (!previous) return;
    set({ user: { ...previous, ...patch } });
    try {
      const user = await authApi.updateProfile(patch);
      set({ user });
      await storage.set(STORAGE_KEYS.session, user);
    } catch {
      set({ user: previous, error: 'Profil güncellenemedi.' });
    }
  },

  async updatePreferences(preferences) {
    const previous = get().user;
    if (!previous) return;
    const merged = { ...previous.preferences, ...preferences };
    set({ user: { ...previous, preferences: merged } });
    try {
      const user = await authApi.updatePreferences(merged);
      set({ user });
      await storage.set(STORAGE_KEYS.session, user);
    } catch {
      set({ user: previous, error: 'Tercihler güncellenemedi.' });
    }
  },

  async updateNotifications(settings) {
    const previous = get().user;
    if (!previous) return;
    const merged = { ...previous.notifications, ...settings };
    set({ user: { ...previous, notifications: merged } });
    try {
      const user = await authApi.updateNotifications(merged);
      set({ user });
      await storage.set(STORAGE_KEYS.session, user);
    } catch {
      set({ user: previous, error: 'Bildirim ayarları güncellenemedi.' });
    }
  },

  /**
   * Push token sunucuya kaydedilir. Token kaydedildiği andan itibaren günlük
   * bildirimi sunucu gönderir; cihaz yerel planlamayı bırakır (bkz.
   * useDailyNotificationScheduler). Böylece aynı saatte tek bildirim gelir.
   */
  async registerPushToken(token, timezone) {
    const previous = get().user;
    if (!previous) return;

    const current = previous.notifications;
    if (current.pushToken === token && current.timezone === timezone) return;

    try {
      await authApi.registerPushToken(token, timezone);
    } catch {
      // Kayıt olmadıysa cihaz yerel bildirime devam eder; bir sonraki
      // açılışta yeniden denenir.
      return;
    }

    const latest = get().user;
    if (!latest) return;
    const merged = { ...latest.notifications, pushToken: token, timezone };
    const user = { ...latest, notifications: merged };
    set({ user });
    await storage.set(STORAGE_KEYS.session, user);
  },

  async updateLocation(location) {
    const previous = get().user;
    if (!previous) return;
    const merged = { ...previous.location, ...location };
    set({ user: { ...previous, location: merged } });
    try {
      const user = await authApi.updateProfile({ location: merged });
      set({ user });
      await storage.set(STORAGE_KEYS.session, user);
    } catch {
      set({ user: previous });
    }
  },

  async completeOnboarding() {
    await get().updateProfile({ onboardingCompleted: true });
  },

  clearError() {
    set({ error: null });
  },
}));

/**
 * 401 alındığında önce refresh token ile yeni bir oturum denenir.
 * Access token kısa ömürlü olduğu için bu olmadan kullanıcı düzenli olarak
 * uygulamadan atılırdı.
 */
setTokenRefresher(async () => {
  const refreshToken = await secureStorage.get(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return false;

  try {
    const session = await authApi.refresh(refreshToken);
    await persistSession(session);
    useAuthStore.setState({ user: session.user, status: 'success' });
    return true;
  } catch {
    return false;
  }
});

// Yenileme de başarısız olduysa oturumu düşür
setUnauthorizedHandler(async () => {
  await clearSession();
  useAuthStore.setState({ user: null, status: 'idle' });
});
