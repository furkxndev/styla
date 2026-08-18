/**
 * Frontend ile paylaşılan API sözleşmesi.
 *
 * Bu dosya `frontend/src/types/` altındaki tiplerin birebir karşılığıdır.
 * Controller'lar bu şekilleri döndürmek zorundadır; değişiklik yapılacaksa
 * her iki taraf birlikte güncellenmelidir.
 */

/* ----------------------------------------------------------------- kıyafet */

export type ClothingCategory =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'dress'
  | 'shoes'
  | 'accessory'
  | 'bag'
  | 'other';

export type StyleTag =
  | 'casual'
  | 'smart_casual'
  | 'formal'
  | 'sporty'
  | 'streetwear'
  | 'bohem'
  | 'minimal'
  | 'vintage'
  | 'elegant';

export type Pattern =
  | 'solid'
  | 'striped'
  | 'checked'
  | 'floral'
  | 'polka_dot'
  | 'graphic'
  | 'animal'
  | 'denim'
  | 'other';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type Material =
  | 'cotton'
  | 'wool'
  | 'denim'
  | 'leather'
  | 'linen'
  | 'silk'
  | 'polyester'
  | 'knit'
  | 'other';

export type Formality = 1 | 2 | 3 | 4 | 5;

export type ColorFamily =
  | 'black'
  | 'white'
  | 'gray'
  | 'beige'
  | 'brown'
  | 'navy'
  | 'blue'
  | 'green'
  | 'red'
  | 'pink'
  | 'purple'
  | 'yellow'
  | 'orange'
  | 'multi';

export interface ClothingColor {
  name: string;
  hex: string;
  family: ColorFamily;
}

export interface TemperatureRange {
  min: number;
  max: number;
}

export interface ClothingItemResponse {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  name: string;
  category: ClothingCategory;
  subcategory?: string;
  colors: ClothingColor[];
  pattern: Pattern;
  styles: StyleTag[];
  seasons: Season[];
  materials?: Material[];
  formality: Formality;
  temperatureRange: TemperatureRange;
  brand?: string;
  notes?: string;
  isFavorite: boolean;
  wearCount: number;
  lastWornAt?: string | null;
  aiConfidence?: number;
  isUserEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

/** AI görsel analizi çıktısı (kullanıcı onayından önce) */
export interface ClothingAnalysisResult {
  name: string;
  category: ClothingCategory;
  subcategory?: string;
  colors: ClothingColor[];
  pattern: Pattern;
  styles: StyleTag[];
  seasons: Season[];
  materials?: Material[];
  formality: Formality;
  temperatureRange: TemperatureRange;
  confidence: number;
}

/* ------------------------------------------------------------- hava durumu */

export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist';

export interface HourlyForecast {
  time: string;
  temperature: number;
  condition: WeatherCondition;
  precipitationProbability: number;
}

export interface WeatherSnapshot {
  city: string;
  country?: string;
  coordinates: { latitude: number; longitude: number };
  temperature: number;
  feelsLike: number;
  minTemperature: number;
  maxTemperature: number;
  condition: WeatherCondition;
  description: string;
  humidity: number;
  windSpeed: number;
  precipitationProbability: number;
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
  hourly: HourlyForecast[];
  fetchedAt: string;
}

/* ------------------------------------------------------------------ kombin */

export type Occasion =
  | 'daily'
  | 'university'
  | 'work'
  | 'sport'
  | 'friends'
  | 'dinner'
  | 'special_event'
  | 'travel';

export type OutfitSlotRole =
  | 'outerwear'
  | 'top'
  | 'bottom'
  | 'dress'
  | 'shoes'
  | 'accessory'
  | 'bag';

export type OutfitFeedbackValue = 'liked' | 'disliked' | 'worn' | null;

export type DislikeReason =
  | 'colors'
  | 'style'
  | 'weather'
  | 'occasion'
  | 'repetitive'
  | 'other';

export interface OutfitSlotResponse {
  role: OutfitSlotRole;
  itemId: string;
  item: ClothingItemResponse;
  reason?: string;
}

export interface OutfitScore {
  colorHarmony: number;
  styleCoherence: number;
  weatherFit: number;
  personalPreference: number;
  overall: number;
}

export interface OutfitResponse {
  id: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  occasion: Occasion;
  slots: OutfitSlotResponse[];
  summary: string;
  stylingTip?: string;
  score: OutfitScore;
  weather?: WeatherSnapshot;
  feedback: OutfitFeedbackValue;
  wornAt?: string | null;
  note?: string;
  photoUrl?: string;
  isGeneratedByAI: boolean;
  createdAt: string;
}

/* ---------------------------------------------------------------- kullanıcı */

export type Gender = 'female' | 'male' | 'unspecified';

export type UserRole = 'user' | 'admin';

export interface StylePreferences {
  favoriteStyles: StyleTag[];
  avoidedColors: ColorFamily[];
  temperatureSensitivity: 'cold' | 'neutral' | 'warm';
  frequentOccasions: Occasion[];
  preferredSeasonPalette?: Season;
  defaultFormality: number;
}

export interface NotificationSettings {
  dailyOutfitEnabled: boolean;
  /** "08:00" */
  dailyOutfitTime: string;
  weatherAlertsEnabled: boolean;
  wearReminderEnabled: boolean;
  /**
   * Expo push token. Doluysa bildirimi sunucu gönderir; cihaz kendi yerel
   * bildirimini planlamaz (yoksa iki bildirim gelirdi).
   */
  pushToken?: string | null;
  /**
   * Cihazın IANA saat dilimi ("Europe/Istanbul"). Bildirim saati sunucunun
   * değil kullanıcının yerel saatine göre değerlendirilir.
   */
  timezone?: string | null;
  /**
   * Sunucu içi durum: günlük bildirimin gönderildiği son gün (YYYY-MM-DD).
   * API cevabına yazılmaz (bkz. user.mapper.ts).
   */
  lastNotifiedDate?: string | null;
}

export interface UserLocationSettings {
  city?: string;
  latitude?: number;
  longitude?: number;
  useDeviceLocation: boolean;
}

export interface UserResponse {
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
  /** epoch ms */
  expiresAt: number;
}

export interface AuthSessionResponse {
  user: UserResponse;
  tokens: AuthTokens;
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

/* ----------------------------------------------------------------- asistan */

export type ChatRole = 'user' | 'assistant';

export interface ChatMessageResponse {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  referencedItems?: ClothingItemResponse[];
  suggestedOutfit?: OutfitResponse | null;
}

/* ------------------------------------------------------- sabit değer listeleri */

export const CLOTHING_CATEGORIES: ClothingCategory[] = [
  'top',
  'bottom',
  'outerwear',
  'dress',
  'shoes',
  'accessory',
  'bag',
  'other',
];

export const STYLE_TAGS: StyleTag[] = [
  'casual',
  'smart_casual',
  'formal',
  'sporty',
  'streetwear',
  'bohem',
  'minimal',
  'vintage',
  'elegant',
];

export const PATTERNS: Pattern[] = [
  'solid',
  'striped',
  'checked',
  'floral',
  'polka_dot',
  'graphic',
  'animal',
  'denim',
  'other',
];

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const MATERIALS: Material[] = [
  'cotton',
  'wool',
  'denim',
  'leather',
  'linen',
  'silk',
  'polyester',
  'knit',
  'other',
];

export const COLOR_FAMILIES: ColorFamily[] = [
  'black',
  'white',
  'gray',
  'beige',
  'brown',
  'navy',
  'blue',
  'green',
  'red',
  'pink',
  'purple',
  'yellow',
  'orange',
  'multi',
];

export const OCCASIONS: Occasion[] = [
  'daily',
  'university',
  'work',
  'sport',
  'friends',
  'dinner',
  'special_event',
  'travel',
];

export const OUTFIT_SLOT_ROLES: OutfitSlotRole[] = [
  'outerwear',
  'top',
  'bottom',
  'dress',
  'shoes',
  'accessory',
  'bag',
];

export const WEATHER_CONDITIONS: WeatherCondition[] = [
  'clear',
  'clouds',
  'rain',
  'drizzle',
  'thunderstorm',
  'snow',
  'mist',
];

/* ------------------------------------------------------------------- admin */

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

/** Veritabanında tutulan, çalışma anında değiştirilebilen sistem ayarları */
export interface AppSettings {
  /** Metin modeli (kombin + asistan) */
  aiModel: string;
  /** Görsel analiz modeli */
  aiVisionModel: string;
  aiTemperature: number;
  /** AI prompt'una gönderilecek azami parça sayısı (maliyet sınırı) */
  maxWardrobeItemsPerPrompt: number;
  /** Yeni kayıt alınsın mı */
  registrationEnabled: boolean;
  /** Kapalıysa tüm AI uçları 503 döner (acil maliyet freni) */
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

/** Sağlayıcı hesabından okunan gerçek kullanım (bizim kaydımızdan bağımsız) */
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
  /** Kendi kayıtlarımızdan hesaplanan */
  today: AiUsageBucket;
  month: AiUsageBucket;
  byFeature: { feature: AiFeature; cost: number; requests: number }[];
  /** Son 30 gün, grafik için */
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
