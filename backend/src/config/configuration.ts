/**
 * Uygulama yapılandırması.
 * Tüm gizli bilgiler environment variable üzerinden okunur; kod içinde
 * hiçbir anahtar/parola bulunmaz.
 */

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

export const configuration = () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: toInt(process.env.PORT, 4000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigins: (process.env.CORS_ORIGINS ?? '*')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${toInt(process.env.PORT, 4000)}`,
    // Üretimde açıkça açılmadıkça /docs yayınlanmaz.
    swaggerEnabled: toBool(process.env.SWAGGER_ENABLED, process.env.NODE_ENV !== 'production'),
  },

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5432),
    username: process.env.DB_USERNAME ?? 'kombin',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'kombin',
    /** Geliştirmede şema otomatik oluşturulur; üretimde migration kullanılır */
    synchronize: toBool(process.env.DB_SYNCHRONIZE, process.env.NODE_ENV !== 'production'),
    logging: toBool(process.env.DB_LOGGING, false),
    ssl: toBool(process.env.DB_SSL, false),
  },

  admin: {
    /**
     * Bu e-postayla kayıtlı kullanıcı açılışta admin'e yükseltilir.
     * Boşsa hiç kimse otomatik yetkilendirilmez.
     */
    email: process.env.ADMIN_EMAIL ?? '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  ai: {
    /** İleride başka sağlayıcı eklenirse burası değişir: 'openrouter' | ... */
    provider: process.env.AI_PROVIDER ?? 'openrouter',
    openRouter: {
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5',
      visionModel:
        process.env.OPENROUTER_VISION_MODEL ??
        process.env.OPENROUTER_MODEL ??
        'anthropic/claude-sonnet-4.5',
      /** OpenRouter sıralamalarında görünmek için opsiyonel başlıklar */
      appUrl: process.env.OPENROUTER_APP_URL ?? '',
      appTitle: process.env.OPENROUTER_APP_TITLE ?? 'Kombin',
      timeoutMs: toInt(process.env.OPENROUTER_TIMEOUT_MS, 60000),
      maxRetries: toInt(process.env.OPENROUTER_MAX_RETRIES, 2),
    },
  },

  weather: {
    /** Open-Meteo anahtar gerektirmez */
    baseUrl: process.env.WEATHER_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast',
    geocodingUrl:
      process.env.WEATHER_GEOCODING_URL ?? 'https://geocoding-api.open-meteo.com/v1/search',
    cacheTtlMs: toInt(process.env.WEATHER_CACHE_TTL_MS, 30 * 60 * 1000),
    timeoutMs: toInt(process.env.WEATHER_TIMEOUT_MS, 10000),
  },

  storage: {
    /** 'local' | ileride 's3' */
    driver: process.env.STORAGE_DRIVER ?? 'local',
    localDir: process.env.STORAGE_LOCAL_DIR ?? 'uploads',
    maxFileSizeMb: toInt(process.env.STORAGE_MAX_FILE_SIZE_MB, 8),
  },

  scheduler: {
    /** Sabah kombini görevi açık mı (test/CI'da kapatılabilir) */
    dailyOutfitEnabled: toBool(process.env.DAILY_OUTFIT_JOB_ENABLED, true),
  },

  push: {
    expoUrl: process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send',
  },

  throttle: {
    ttlMs: toInt(process.env.THROTTLE_TTL_MS, 60000),
    limit: toInt(process.env.THROTTLE_LIMIT, 120),
    aiLimit: toInt(process.env.THROTTLE_AI_LIMIT, 20),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
