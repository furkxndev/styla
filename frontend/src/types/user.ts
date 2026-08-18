import type { ColorFamily, Season, StyleTag } from './clothing';
import type { Occasion } from './outfit';

export type Gender = 'female' | 'male' | 'unspecified';

export type UserRole = 'user' | 'admin';

export interface StylePreferences {
  favoriteStyles: StyleTag[];
  avoidedColors: ColorFamily[];
  /** Kullanıcı üşüyen mi terleyen mi -> sıcaklık toleransı */
  temperatureSensitivity: 'cold' | 'neutral' | 'warm';
  /** Genelde hangi durumlar için giyiniyor */
  frequentOccasions: Occasion[];
  preferredSeasonPalette?: Season;
  /** 1 = çok rahat, 5 = çok resmi */
  defaultFormality: number;
}

export interface NotificationSettings {
  dailyOutfitEnabled: boolean;
  /** "08:00" formatında */
  dailyOutfitTime: string;
  weatherAlertsEnabled: boolean;
  /** Kullanıcının kombini işaretlemesi için akşam hatırlatması */
  wearReminderEnabled: boolean;
  /**
   * Expo push token. Doluysa bildirimi sunucu gönderir ve cihaz yerel bildirim
   * planlamaz; aksi halde aynı saatte iki bildirim gelirdi.
   */
  pushToken?: string | null;
  /** Cihazın IANA saat dilimi; sunucu bildirim saatini buna göre hesaplar */
  timezone?: string | null;
}

export interface UserLocationSettings {
  city?: string;
  latitude?: number;
  longitude?: number;
  useDeviceLocation: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /** Pasife alınan kullanıcı giriş yapamaz */
  isActive: boolean;
  avatarUrl?: string | null;
  gender: Gender;
  birthYear?: number;
  preferences: StylePreferences;
  notifications: NotificationSettings;
  location: UserLocationSettings;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface WardrobeStats {
  totalItems: number;
  byCategory: Record<string, number>;
  totalOutfits: number;
  wornOutfits: number;
  mostWornItemId?: string;
  neverWornCount: number;
  streakDays: number;
}
