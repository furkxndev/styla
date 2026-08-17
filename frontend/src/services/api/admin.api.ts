import { config } from '../../constants/config';
import type {
  AdminOverview,
  AdminUserFilters,
  AdminUserListResponse,
  AdminUserSummary,
  AiFeature,
  AiModelOption,
  AiUsageSummary,
  AppSettings,
} from '../../types/admin';
import { ApiError } from '../../types/api';
import { apiClient } from './client';

/**
 * Admin uç noktaları burada tutuluyor: `endpoints.ts` diğer modüllerle paylaşılan
 * bir sözleşme dosyası, admin yolları oraya sızmasın diye yerelde tanımlandı.
 */
const ADMIN = {
  overview: '/admin/overview',
  users: '/admin/users',
  user: (id: string) => `/admin/users/${id}`,
  settings: '/admin/settings',
  models: '/admin/models',
  usage: '/admin/usage',
} as const;

// ---------------------------------------------------------------------------
// Mock katmanı — backend ayakta değilken panel yine de gezilebilsin diye.
// mockServer.ts paylaşılan dosya olduğu için admin sahte verisi burada duruyor.
// ---------------------------------------------------------------------------

const delay = <T>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** Aynı girdi için hep aynı sayıyı üretir; demo verisi her açılışta zıplamasın */
const pseudo = (seed: number, max: number) =>
  Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % max;

const MOCK_NAMES = [
  'Elif Yıldız',
  'Mert Kaya',
  'Zeynep Demir',
  'Can Aydın',
  'Selin Arslan',
  'Burak Şahin',
  'Deniz Koç',
  'Ece Polat',
  'Kaan Erdem',
  'Naz Çelik',
  'Ali Doğan',
  'Ayşe Kurt',
  'Emre Taş',
  'Melis Ünal',
  'Onur Bilgin',
  'Sude Aksoy',
  'Tolga Yücel',
  'Yasemin Öz',
  'Berk Sarı',
  'Ceren Ateş',
];

const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const buildMockUsers = (): AdminUserSummary[] =>
  Array.from({ length: 34 }, (_, index) => {
    const name = MOCK_NAMES[index % MOCK_NAMES.length];
    const suffix =
      index >= MOCK_NAMES.length ? ` ${Math.floor(index / MOCK_NAMES.length) + 1}` : '';
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z.]/g, '');
    return {
      id: `mock-user-${index + 1}`,
      email: `${slug}${index}@ornek.com`,
      fullName: `${name}${suffix}`,
      role: index === 0 || index === 7 ? 'admin' : 'user',
      isActive: index % 9 !== 4,
      onboardingCompleted: index % 5 !== 2,
      createdAt: daysAgoIso(Math.floor(pseudo(index + 1, 120))),
      wardrobeCount: Math.floor(pseudo(index + 3, 60)),
      outfitCount: Math.floor(pseudo(index + 7, 40)),
      lastOutfitAt: index % 6 === 3 ? null : daysAgoIso(Math.floor(pseudo(index + 11, 20))),
    } satisfies AdminUserSummary;
  });

let mockUsers = buildMockUsers();

let mockSettings: AppSettings = {
  aiModel: 'anthropic/claude-3.5-sonnet',
  aiVisionModel: 'openai/gpt-4o-mini',
  aiTemperature: 0.7,
  maxWardrobeItemsPerPrompt: 40,
  registrationEnabled: true,
  aiFeaturesEnabled: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'demo@kombin.app',
};

const MOCK_MODELS: AiModelOption[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    contextLength: 200000,
    promptPrice: 0.000003,
    completionPrice: 0.000015,
    supportsImages: true,
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    contextLength: 200000,
    promptPrice: 0.0000008,
    completionPrice: 0.000004,
    supportsImages: true,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    contextLength: 128000,
    promptPrice: 0.0000025,
    completionPrice: 0.00001,
    supportsImages: true,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o mini',
    contextLength: 128000,
    promptPrice: 0.00000015,
    completionPrice: 0.0000006,
    supportsImages: true,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    contextLength: 1000000,
    promptPrice: 0.0000001,
    completionPrice: 0.0000004,
    supportsImages: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B Instruct',
    contextLength: 131072,
    promptPrice: 0.00000012,
    completionPrice: 0.0000003,
    supportsImages: false,
  },
  {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large',
    contextLength: 128000,
    promptPrice: 0.000002,
    completionPrice: 0.000006,
    supportsImages: false,
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    contextLength: 64000,
    promptPrice: 0.00000027,
    completionPrice: 0.0000011,
    supportsImages: false,
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5 72B',
    contextLength: 32768,
    promptPrice: 0.00000023,
    completionPrice: 0.0000004,
    supportsImages: false,
  },
  {
    id: 'x-ai/grok-2-vision',
    name: 'Grok 2 Vision',
    contextLength: 32768,
    promptPrice: 0.000002,
    completionPrice: 0.00001,
    supportsImages: true,
  },
];

const buildMockUsage = (): AiUsageSummary => {
  const dailySeries = Array.from({ length: 30 }, (_, index) => {
    const day = 29 - index;
    const requests = 4 + Math.floor(pseudo(day + 2, 30));
    return {
      date: daysAgoIso(day).slice(0, 10),
      cost: Number((requests * (0.0009 + pseudo(day + 5, 0.002))).toFixed(6)),
      requests,
    };
  });

  const today = dailySeries[dailySeries.length - 1];
  const monthCost = dailySeries.reduce((sum, day) => sum + day.cost, 0);
  const monthRequests = dailySeries.reduce((sum, day) => sum + day.requests, 0);

  const featureShare: { feature: AiFeature; share: number }[] = [
    { feature: 'outfit', share: 0.52 },
    { feature: 'analysis', share: 0.31 },
    { feature: 'assistant', share: 0.17 },
  ];

  return {
    currency: 'USD',
    today: { cost: today.cost, requests: today.requests, tokens: today.requests * 1850 },
    month: {
      cost: Number(monthCost.toFixed(6)),
      requests: monthRequests,
      tokens: monthRequests * 1850,
    },
    byFeature: featureShare.map(({ feature, share }) => ({
      feature,
      cost: Number((monthCost * share).toFixed(6)),
      requests: Math.round(monthRequests * share),
    })),
    dailySeries,
    provider: {
      usageDaily: Number((today.cost * 1.18).toFixed(6)),
      usageWeekly: Number((monthCost * 0.27).toFixed(6)),
      usageMonthly: Number((monthCost * 1.12).toFixed(6)),
      usageTotal: Number((monthCost * 3.4).toFixed(6)),
      limit: 25,
      limitRemaining: Number((25 - monthCost * 3.4).toFixed(6)),
      creditsTotal: 25,
      creditsUsed: Number((monthCost * 3.4).toFixed(6)),
    },
  };
};

const mockAdmin = {
  overview: (): Promise<AdminOverview> => {
    const usage = buildMockUsage();
    return delay({
      users: {
        total: mockUsers.length,
        active: mockUsers.filter((user) => user.isActive).length,
        admins: mockUsers.filter((user) => user.role === 'admin').length,
        newLast7Days: mockUsers.filter(
          (user) => Date.now() - new Date(user.createdAt).getTime() < 7 * 86400000,
        ).length,
      },
      content: {
        wardrobeItems: mockUsers.reduce((sum, user) => sum + user.wardrobeCount, 0),
        outfits: mockUsers.reduce((sum, user) => sum + user.outfitCount, 0),
        wornOutfits: Math.round(
          mockUsers.reduce((sum, user) => sum + user.outfitCount, 0) * 0.61,
        ),
        chatMessages: 1284,
      },
      ai: usage,
      settings: mockSettings,
    });
  },

  listUsers: (filters: AdminUserFilters = {}): Promise<AdminUserListResponse> => {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const query = filters.search?.trim().toLocaleLowerCase('tr-TR');

    const filtered = mockUsers.filter((user) => {
      if (filters.role && user.role !== filters.role) return false;
      if (filters.isActive !== undefined && user.isActive !== filters.isActive)
        return false;
      if (query) {
        const haystack = `${user.fullName} ${user.email}`.toLocaleLowerCase('tr-TR');
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const start = (page - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    return delay({
      data: slice,
      page,
      pageSize,
      total: filtered.length,
      hasMore: start + slice.length < filtered.length,
    });
  },

  getUser: (id: string): Promise<AdminUserSummary> => {
    const user = mockUsers.find((candidate) => candidate.id === id);
    if (!user) return Promise.reject(new ApiError('not_found', 'Kullanıcı bulunamadı.'));
    return delay(user);
  },

  updateUser: (
    id: string,
    patch: { role?: AdminUserSummary['role']; isActive?: boolean },
  ): Promise<AdminUserSummary> => {
    const user = mockUsers.find((candidate) => candidate.id === id);
    if (!user) return Promise.reject(new ApiError('not_found', 'Kullanıcı bulunamadı.'));

    // Backend'deki "son yönetici" korumasını demo tarafında da taklit ediyoruz
    const admins = mockUsers.filter((candidate) => candidate.role === 'admin');
    if (patch.role === 'user' && user.role === 'admin' && admins.length === 1) {
      return Promise.reject(
        new ApiError('validation', 'Sistemdeki son yöneticinin rolü değiştirilemez.', 400),
      );
    }

    const updated: AdminUserSummary = { ...user, ...patch };
    mockUsers = mockUsers.map((candidate) => (candidate.id === id ? updated : candidate));
    return delay(updated);
  },

  deleteUser: (id: string): Promise<void> => {
    const user = mockUsers.find((candidate) => candidate.id === id);
    if (!user) return Promise.reject(new ApiError('not_found', 'Kullanıcı bulunamadı.'));

    const admins = mockUsers.filter((candidate) => candidate.role === 'admin');
    if (user.role === 'admin' && admins.length === 1) {
      return Promise.reject(
        new ApiError('validation', 'Sistemdeki son yönetici hesabı silinemez.', 400),
      );
    }

    mockUsers = mockUsers.filter((candidate) => candidate.id !== id);
    return delay(undefined);
  },

  getSettings: (): Promise<AppSettings> => delay(mockSettings),

  updateSettings: (patch: Partial<AppSettings>): Promise<AppSettings> => {
    mockSettings = {
      ...mockSettings,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return delay(mockSettings);
  },

  listModels: (): Promise<AiModelOption[]> => delay(MOCK_MODELS),

  usage: (): Promise<AiUsageSummary> => delay(buildMockUsage()),
};

// ---------------------------------------------------------------------------

/** Sayfalama/filtre alanlarını query string'e uygun hâle getirir */
const toQuery = (filters: AdminUserFilters) => ({
  search: filters.search?.trim() || undefined,
  role: filters.role,
  isActive: filters.isActive,
  page: filters.page,
  pageSize: filters.pageSize,
});

export const adminApi = {
  overview: (): Promise<AdminOverview> =>
    config.useMockApi ? mockAdmin.overview() : apiClient.get<AdminOverview>(ADMIN.overview),

  listUsers: (filters: AdminUserFilters = {}): Promise<AdminUserListResponse> =>
    config.useMockApi
      ? mockAdmin.listUsers(filters)
      : apiClient.get<AdminUserListResponse>(ADMIN.users, { query: toQuery(filters) }),

  getUser: (id: string): Promise<AdminUserSummary> =>
    config.useMockApi
      ? mockAdmin.getUser(id)
      : apiClient.get<AdminUserSummary>(ADMIN.user(id)),

  updateUser: (
    id: string,
    patch: { role?: AdminUserSummary['role']; isActive?: boolean },
  ): Promise<AdminUserSummary> =>
    config.useMockApi
      ? mockAdmin.updateUser(id, patch)
      : apiClient.patch<AdminUserSummary>(ADMIN.user(id), patch),

  deleteUser: (id: string): Promise<void> =>
    config.useMockApi ? mockAdmin.deleteUser(id) : apiClient.delete<void>(ADMIN.user(id)),

  getSettings: (): Promise<AppSettings> =>
    config.useMockApi
      ? mockAdmin.getSettings()
      : apiClient.get<AppSettings>(ADMIN.settings),

  updateSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    config.useMockApi
      ? mockAdmin.updateSettings(patch)
      : apiClient.patch<AppSettings>(ADMIN.settings, patch),

  /** OpenRouter kataloğu 400+ modelden oluşur; ekranda arama zorunlu */
  listModels: (): Promise<AiModelOption[]> =>
    config.useMockApi
      ? mockAdmin.listModels()
      : apiClient.get<AiModelOption[]>(ADMIN.models),

  usage: (): Promise<AiUsageSummary> =>
    config.useMockApi ? mockAdmin.usage() : apiClient.get<AiUsageSummary>(ADMIN.usage),
};
