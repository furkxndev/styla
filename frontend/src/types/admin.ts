import type { UserRole } from './user';

/**
 * Admin paneli tipleri — backend `domain.types.ts` ile birebir aynıdır.
 * Yalnızca rolü 'admin' olan kullanıcılar bu uçlara erişebilir.
 */

export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  wardrobeCount: number;
  outfitCount: number;
  lastOutfitAt?: string | null;
}

export interface AdminUserListResponse {
  data: AdminUserSummary[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** Çalışma anında değiştirilebilen sistem ayarları */
export interface AppSettings {
  aiModel: string;
  aiVisionModel: string;
  aiTemperature: number;
  maxWardrobeItemsPerPrompt: number;
  registrationEnabled: boolean;
  aiFeaturesEnabled: boolean;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface AiModelOption {
  id: string;
  name: string;
  contextLength: number;
  /** 1 token başına USD */
  promptPrice: number;
  completionPrice: number;
  supportsImages: boolean;
}

export type AiFeature = 'outfit' | 'analysis' | 'assistant';

export interface AiUsageBucket {
  cost: number;
  requests: number;
  tokens: number;
}

export interface AiProviderAccountUsage {
  usageDaily: number;
  usageWeekly: number;
  usageMonthly: number;
  usageTotal: number;
  limit: number | null;
  limitRemaining: number | null;
  creditsTotal?: number | null;
  creditsUsed?: number | null;
}

export interface AiUsageSummary {
  currency: 'USD';
  today: AiUsageBucket;
  month: AiUsageBucket;
  byFeature: { feature: AiFeature; cost: number; requests: number }[];
  dailySeries: { date: string; cost: number; requests: number }[];
  /** OpenRouter hesabının bildirdiği gerçek harcama; erişilemezse null */
  provider: AiProviderAccountUsage | null;
}

export interface AdminOverview {
  users: { total: number; active: number; admins: number; newLast7Days: number };
  content: {
    wardrobeItems: number;
    outfits: number;
    wornOutfits: number;
    chatMessages: number;
  };
  ai: AiUsageSummary;
  settings: AppSettings;
}

export interface AdminUserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}
