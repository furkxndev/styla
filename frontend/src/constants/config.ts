import Constants from 'expo-constants';

type Extra = {
  apiUrl?: string;
  useMockApi?: boolean | string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const toBool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
};

export const config = {
  /** Backend hazır olduğunda app.json -> extra.apiUrl güncellenir. */
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:4000/api/v1',

  /**
   * Backend yokken uygulamanın uçtan uca çalışabilmesi için sahte API katmanı.
   *
   * Varsayılan bilinçli olarak `false`: derlemede `.env` dosyası bulunmadığında
   * (EAS Build projeyi .gitignore'a saygı duyarak yüklediği için .env gitmez)
   * uygulama sessizce sahte veriyle çalışmasın. Mock istiyorsan açıkça
   * `EXPO_PUBLIC_USE_MOCK_API=true` vermelisin.
   */
  useMockApi: toBool(process.env.EXPO_PUBLIC_USE_MOCK_API ?? extra.useMockApi, false),

  requestTimeoutMs: 20000,
  /** AI görsel analizi / kombin üretimi daha uzun sürebilir */
  aiRequestTimeoutMs: 60000,

  weather: {
    /** Hava durumu bu süre boyunca tekrar çekilmez */
    cacheTtlMs: 30 * 60 * 1000,
  },

  assistant: {
    maxHistoryMessages: 12,
  },

  wardrobe: {
    maxImageSizeMb: 8,
    imageQuality: 0.7,
  },
} as const;

export const isMock = () => config.useMockApi;
