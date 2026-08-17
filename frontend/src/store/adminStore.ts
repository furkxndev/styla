import { create } from 'zustand';
import { adminApi } from '../services/api';
import type {
  AdminOverview,
  AdminUserFilters,
  AdminUserSummary,
  AiModelOption,
  AppSettings,
} from '../types/admin';
import { ApiError, type AsyncStatus } from '../types/api';

/** Sunucu hatasını kullanıcıya gösterilebilir Türkçe metne indirger */
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

const PAGE_SIZE = 20;

interface AdminState {
  overview: AdminOverview | null;
  overviewStatus: AsyncStatus;
  overviewError: string | null;

  users: AdminUserSummary[];
  usersStatus: AsyncStatus;
  usersError: string | null;
  /** "Daha fazla yükle" sırasındaki ikinci yükleme; ana iskeleti tetiklemesin */
  loadingMore: boolean;
  page: number;
  total: number;
  hasMore: boolean;
  filters: AdminUserFilters;

  selectedUser: AdminUserSummary | null;
  selectedStatus: AsyncStatus;
  selectedError: string | null;

  settings: AppSettings | null;
  settingsStatus: AsyncStatus;
  settingsError: string | null;
  saving: boolean;

  models: AiModelOption[];
  modelsStatus: AsyncStatus;

  fetchOverview: (options?: { silent?: boolean }) => Promise<void>;
  fetchUsers: (options?: { silent?: boolean }) => Promise<void>;
  loadMoreUsers: () => Promise<void>;
  setFilters: (patch: Partial<AdminUserFilters>) => void;
  selectUser: (id: string) => Promise<void>;
  updateUser: (
    id: string,
    patch: { role?: AdminUserSummary['role']; isActive?: boolean },
  ) => Promise<string | null>;
  deleteUser: (id: string) => Promise<string | null>;
  fetchSettings: (options?: { silent?: boolean }) => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<string | null>;
  fetchModels: () => Promise<void>;
  reset: () => void;
}

const defaultFilters: AdminUserFilters = { page: 1, pageSize: PAGE_SIZE };

export const useAdminStore = create<AdminState>((set, get) => ({
  overview: null,
  overviewStatus: 'idle',
  overviewError: null,

  users: [],
  usersStatus: 'idle',
  usersError: null,
  loadingMore: false,
  page: 1,
  total: 0,
  hasMore: false,
  filters: defaultFilters,

  selectedUser: null,
  selectedStatus: 'idle',
  selectedError: null,

  settings: null,
  settingsStatus: 'idle',
  settingsError: null,
  saving: false,

  models: [],
  modelsStatus: 'idle',

  async fetchOverview(options) {
    if (!options?.silent) set({ overviewStatus: 'loading', overviewError: null });
    try {
      const overview = await adminApi.overview();
      // Genel bakış ayarları da taşıyor; ayrı bir istek atmamak için buradan besliyoruz
      set({
        overview,
        overviewStatus: 'success',
        settings: overview.settings,
        settingsStatus: 'success',
      });
    } catch (error) {
      set({
        overviewStatus: 'error',
        overviewError: errorMessage(error, 'Yönetim özeti yüklenemedi.'),
      });
    }
  },

  async fetchUsers(options) {
    if (!options?.silent) set({ usersStatus: 'loading', usersError: null });
    try {
      const response = await adminApi.listUsers({ ...get().filters, page: 1 });
      set({
        users: response.data,
        page: response.page,
        total: response.total,
        hasMore: response.hasMore,
        usersStatus: 'success',
      });
    } catch (error) {
      set({
        usersStatus: 'error',
        usersError: errorMessage(error, 'Kullanıcılar yüklenemedi.'),
      });
    }
  },

  async loadMoreUsers() {
    const { hasMore, loadingMore, page, filters, users } = get();
    if (!hasMore || loadingMore) return;

    set({ loadingMore: true });
    try {
      const response = await adminApi.listUsers({ ...filters, page: page + 1 });
      // Sunucudan aynı kayıt tekrar gelirse listeye iki kez eklenmesin
      const existing = new Set(users.map((user) => user.id));
      set({
        users: [...users, ...response.data.filter((user) => !existing.has(user.id))],
        page: response.page,
        total: response.total,
        hasMore: response.hasMore,
      });
    } catch (error) {
      set({ usersError: errorMessage(error, 'Sonraki sayfa yüklenemedi.') });
    } finally {
      set({ loadingMore: false });
    }
  },

  setFilters(patch) {
    set({ filters: { ...get().filters, ...patch, page: 1 } });
  },

  async selectUser(id) {
    // Listeden gelen kayıt varsa ekran boş açılmasın, arka planda tazelensin
    const cached = get().users.find((user) => user.id === id) ?? null;
    set({
      selectedUser: cached,
      selectedStatus: cached ? 'success' : 'loading',
      selectedError: null,
    });

    try {
      const user = await adminApi.getUser(id);
      set({ selectedUser: user, selectedStatus: 'success' });
    } catch (error) {
      set({
        selectedStatus: cached ? 'success' : 'error',
        selectedError: errorMessage(error, 'Kullanıcı bilgileri yüklenemedi.'),
      });
    }
  },

  async updateUser(id, patch) {
    try {
      const updated = await adminApi.updateUser(id, patch);
      set({
        users: get().users.map((user) => (user.id === id ? updated : user)),
        selectedUser: get().selectedUser?.id === id ? updated : get().selectedUser,
      });
      return null;
    } catch (error) {
      return errorMessage(error, 'Kullanıcı güncellenemedi.');
    }
  },

  async deleteUser(id) {
    try {
      await adminApi.deleteUser(id);
      set({
        users: get().users.filter((user) => user.id !== id),
        total: Math.max(0, get().total - 1),
        selectedUser: get().selectedUser?.id === id ? null : get().selectedUser,
      });
      return null;
    } catch (error) {
      return errorMessage(error, 'Kullanıcı silinemedi.');
    }
  },

  async fetchSettings(options) {
    if (!options?.silent) set({ settingsStatus: 'loading', settingsError: null });
    try {
      const settings = await adminApi.getSettings();
      set({ settings, settingsStatus: 'success' });
    } catch (error) {
      set({
        settingsStatus: 'error',
        settingsError: errorMessage(error, 'Ayarlar yüklenemedi.'),
      });
    }
  },

  async saveSettings(patch) {
    set({ saving: true });
    try {
      const settings = await adminApi.updateSettings(patch);
      const overview = get().overview;
      set({
        settings,
        settingsStatus: 'success',
        // Genel bakış açıkken eski model adını göstermesin
        overview: overview ? { ...overview, settings } : overview,
      });
      return null;
    } catch (error) {
      return errorMessage(error, 'Ayarlar kaydedilemedi.');
    } finally {
      set({ saving: false });
    }
  },

  async fetchModels() {
    if (get().modelsStatus === 'loading') return;
    set({ modelsStatus: 'loading' });
    try {
      const models = await adminApi.listModels();
      set({ models, modelsStatus: 'success' });
    } catch {
      set({ modelsStatus: 'error' });
    }
  },

  reset() {
    set({
      overview: null,
      overviewStatus: 'idle',
      overviewError: null,
      users: [],
      usersStatus: 'idle',
      usersError: null,
      loadingMore: false,
      page: 1,
      total: 0,
      hasMore: false,
      filters: defaultFilters,
      selectedUser: null,
      selectedStatus: 'idle',
      selectedError: null,
      settings: null,
      settingsStatus: 'idle',
      settingsError: null,
      saving: false,
      models: [],
      modelsStatus: 'idle',
    });
  },
}));
