import { STORAGE_KEYS } from '../../constants/storageKeys';
import { OCCASION_MAP } from '../../constants/occasions';
import { CATEGORY_MAP, STYLE_LABELS } from '../../constants/categories';
import { ApiError } from '../../types/api';
import type {
  ClothingAnalysisResult,
  ClothingItem,
  CreateClothingItemPayload,
  UpdateClothingItemPayload,
} from '../../types/clothing';
import type {
  GenerateOutfitRequest,
  Occasion,
  Outfit,
  OutfitFeedbackPayload,
} from '../../types/outfit';
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  User,
  WardrobeStats,
} from '../../types/user';
import type { AssistantRequest, ChatMessage } from '../../types/assistant';
import type { WeatherSnapshot } from '../../types/weather';
import { createId } from '../../utils/id';
import { todayKey } from '../../utils/date';
import { generateOutfitLocally } from '../../utils/outfitEngine';
import { deriveLearnedPreferences } from '../../utils/styleRules';
import { storage } from '../storage';
import { buildMockWardrobe, buildMockWeather, MOCK_USER } from './mockData';

/**
 * Backend hazır olana kadar uygulamanın uçtan uca çalışmasını sağlayan
 * sahte sunucu. Veriler cihazda AsyncStorage'da tutulur.
 *
 * Backend bağlandığında `config.useMockApi = false` yapmak yeterlidir;
 * bu dosyaya hiçbir ekran doğrudan bağımlı değildir.
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jitter = (base: number) => base + Math.random() * base * 0.4;

interface MockDb {
  user: User;
  items: ClothingItem[];
  outfits: Outfit[];
  thread: ChatMessage[];
}

const DB_KEY = 'kombin.mock.db';

let cache: MockDb | null = null;

const seedDb = (): MockDb => ({
  user: { ...MOCK_USER },
  items: buildMockWardrobe(MOCK_USER.id),
  outfits: [],
  thread: [],
});

const readDb = async (): Promise<MockDb> => {
  if (cache) return cache;
  const stored = await storage.get<MockDb>(DB_KEY);
  cache = stored ?? seedDb();
  if (!stored) await storage.set(DB_KEY, cache);
  return cache;
};

const writeDb = async (db: MockDb) => {
  cache = db;
  await storage.set(DB_KEY, db);
};

export const resetMockDb = async () => {
  cache = null;
  await storage.remove(DB_KEY);
};

/* ------------------------------------------------------------------ auth */

const makeSession = (user: User): AuthSession => ({
  user,
  tokens: {
    accessToken: `mock_access_${createId('t')}`,
    refreshToken: `mock_refresh_${createId('t')}`,
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
  },
});

export const mockAuth = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    await delay(jitter(600));
    if (!payload.email || !payload.password) {
      throw new ApiError('validation', 'E-posta ve şifre gerekli.');
    }
    if (payload.password.length < 6) {
      throw new ApiError('unauthorized', 'E-posta veya şifre hatalı.');
    }
    const db = await readDb();
    const user: User = { ...db.user, email: payload.email };
    await writeDb({ ...db, user });
    return makeSession(user);
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    await delay(jitter(700));
    const db = await readDb();
    const user: User = {
      ...db.user,
      email: payload.email,
      fullName: payload.fullName,
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
    };
    await writeDb({ ...db, user });
    return makeSession(user);
  },

  async me(): Promise<User> {
    await delay(200);
    const db = await readDb();
    return db.user;
  },

  async logout(): Promise<void> {
    await delay(150);
  },

  async updateUser(patch: Partial<User>): Promise<User> {
    await delay(250);
    const db = await readDb();
    const user: User = {
      ...db.user,
      ...patch,
      preferences: { ...db.user.preferences, ...(patch.preferences ?? {}) },
      notifications: { ...db.user.notifications, ...(patch.notifications ?? {}) },
      location: { ...db.user.location, ...(patch.location ?? {}) },
    };
    await writeDb({ ...db, user });
    return user;
  },

  async stats(): Promise<WardrobeStats> {
    await delay(200);
    const db = await readDb();
    const byCategory = db.items.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});
    const worn = db.outfits.filter((o) => o.wornAt);
    const mostWorn = [...db.items].sort((a, b) => b.wearCount - a.wearCount)[0];

    return {
      totalItems: db.items.length,
      byCategory,
      totalOutfits: db.outfits.length,
      wornOutfits: worn.length,
      mostWornItemId: mostWorn?.id,
      neverWornCount: db.items.filter((item) => item.wearCount === 0).length,
      streakDays: computeStreak(worn.map((o) => o.wornAt as string)),
    };
  },
};

const computeStreak = (dates: string[]): number => {
  if (!dates.length) return 0;
  const days = new Set(dates.map((d) => d.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

/* -------------------------------------------------------------- wardrobe */

export const mockWardrobe = {
  async list(): Promise<ClothingItem[]> {
    await delay(jitter(300));
    const db = await readDb();
    return [...db.items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async create(payload: CreateClothingItemPayload): Promise<ClothingItem> {
    await delay(jitter(400));
    const db = await readDb();
    const item: ClothingItem = {
      ...payload,
      id: createId('item'),
      userId: db.user.id,
      isFavorite: payload.isFavorite ?? false,
      wearCount: 0,
      lastWornAt: null,
      isUserEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeDb({ ...db, items: [item, ...db.items] });
    return item;
  },

  async update(id: string, patch: UpdateClothingItemPayload): Promise<ClothingItem> {
    await delay(jitter(300));
    const db = await readDb();
    const index = db.items.findIndex((item) => item.id === id);
    if (index === -1) throw new ApiError('not_found', 'Ürün bulunamadı.');

    const updated: ClothingItem = {
      ...db.items[index],
      ...patch,
      isUserEdited: true,
      updatedAt: new Date().toISOString(),
    };
    const items = [...db.items];
    items[index] = updated;
    await writeDb({ ...db, items });
    return updated;
  },

  async remove(id: string): Promise<void> {
    await delay(jitter(250));
    const db = await readDb();
    await writeDb({
      ...db,
      items: db.items.filter((item) => item.id !== id),
      outfits: db.outfits.filter((outfit) => !outfit.slots.some((s) => s.itemId === id)),
    });
  },

  async toggleFavorite(id: string): Promise<ClothingItem> {
    const db = await readDb();
    const item = db.items.find((i) => i.id === id);
    if (!item) throw new ApiError('not_found', 'Ürün bulunamadı.');
    return mockWardrobe.update(id, {
      isFavorite: !item.isFavorite,
    } as UpdateClothingItemPayload);
  },

  /** Görsel analizi simülasyonu: gerçekte backend'de vision modeli çalışır */
  async analyze(imageUri: string): Promise<ClothingAnalysisResult> {
    await delay(jitter(1800));
    return analyzeImageHeuristically(imageUri);
  },
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const ANALYSIS_TEMPLATES: ClothingAnalysisResult[] = [
  {
    name: 'Beyaz Tişört',
    category: 'top',
    subcategory: 'Tişört',
    colors: [{ name: 'Beyaz', hex: '#FFFFFF', family: 'white' }],
    pattern: 'solid',
    styles: ['casual', 'minimal'],
    seasons: ['spring', 'summer'],
    materials: ['cotton'],
    formality: 1,
    temperatureRange: { min: 18, max: 34 },
    confidence: 0.93,
  },
  {
    name: 'Mavi Jean Pantolon',
    category: 'bottom',
    subcategory: 'Jean',
    colors: [{ name: 'Denim', hex: '#4A6E96', family: 'blue' }],
    pattern: 'denim',
    styles: ['casual', 'smart_casual'],
    seasons: ['spring', 'autumn', 'winter'],
    materials: ['denim'],
    formality: 2,
    temperatureRange: { min: 2, max: 26 },
    confidence: 0.9,
  },
  {
    name: 'Siyah Sneaker',
    category: 'shoes',
    subcategory: 'Sneaker',
    colors: [{ name: 'Siyah', hex: '#111111', family: 'black' }],
    pattern: 'solid',
    styles: ['casual', 'streetwear'],
    seasons: ['spring', 'autumn', 'winter'],
    materials: ['leather'],
    formality: 2,
    temperatureRange: { min: 5, max: 28 },
    confidence: 0.91,
  },
  {
    name: 'Lacivert Ceket',
    category: 'outerwear',
    subcategory: 'Ceket',
    colors: [{ name: 'Lacivert', hex: '#1F2E4A', family: 'navy' }],
    pattern: 'solid',
    styles: ['smart_casual', 'formal'],
    seasons: ['autumn', 'spring'],
    materials: ['wool'],
    formality: 4,
    temperatureRange: { min: 5, max: 18 },
    confidence: 0.88,
  },
  {
    name: 'Bej Kazak',
    category: 'top',
    subcategory: 'Kazak',
    colors: [{ name: 'Bej', hex: '#D9C3A5', family: 'beige' }],
    pattern: 'solid',
    styles: ['minimal', 'smart_casual'],
    seasons: ['autumn', 'winter'],
    materials: ['knit', 'wool'],
    formality: 3,
    temperatureRange: { min: 0, max: 16 },
    confidence: 0.86,
  },
];

const analyzeImageHeuristically = (imageUri: string): ClothingAnalysisResult => {
  const template = ANALYSIS_TEMPLATES[hashString(imageUri) % ANALYSIS_TEMPLATES.length];
  return {
    ...template,
    confidence: Math.min(0.98, template.confidence + Math.random() * 0.05),
  };
};

/* --------------------------------------------------------------- weather */

export const mockWeather = {
  async current(
    latitude?: number,
    longitude?: number,
    city?: string,
  ): Promise<WeatherSnapshot> {
    await delay(jitter(500));
    return buildMockWeather(latitude, longitude, city);
  },
};

/* --------------------------------------------------------------- outfits */

export const mockOutfits = {
  async list(): Promise<Outfit[]> {
    await delay(jitter(300));
    const db = await readDb();
    return [...db.outfits].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async today(occasion?: Occasion): Promise<Outfit | null> {
    await delay(200);
    const db = await readDb();
    const key = todayKey();
    return (
      db.outfits
        .filter(
          (o) =>
            o.date === key &&
            o.feedback !== 'disliked' &&
            (!occasion || o.occasion === occasion),
        )
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0] ?? null
    );
  },

  async generate(payload: GenerateOutfitRequest): Promise<Outfit> {
    await delay(jitter(1500));
    const db = await readDb();
    const learned = deriveLearnedPreferences(db.outfits);

    const excludedItemIds = db.outfits
      .filter((o) => payload.excludeOutfitIds?.includes(o.id))
      .flatMap((o) => o.slots.map((s) => s.itemId));

    const outfit = generateOutfitLocally(
      {
        items: db.items,
        occasion: payload.occasion,
        weather: payload.weather,
        preferences: db.user.preferences,
        boostedItemIds: learned.boostedItemIds,
        penalizedItemIds: learned.penalizedItemIds,
        excludeItemIds: excludedItemIds,
        pinnedItemIds: payload.pinnedItemIds,
      },
      db.user.id,
      payload.date,
    );

    if (!outfit) {
      throw new ApiError(
        'validation',
        'Kombin oluşturmak için gardırobunda en az bir üst, bir alt parça olmalı.',
      );
    }

    await writeDb({ ...db, outfits: [outfit, ...db.outfits] });
    return outfit;
  },

  async feedback(payload: OutfitFeedbackPayload): Promise<Outfit> {
    await delay(jitter(250));
    const db = await readDb();
    const index = db.outfits.findIndex((o) => o.id === payload.outfitId);
    if (index === -1) throw new ApiError('not_found', 'Kombin bulunamadı.');

    const updated: Outfit = { ...db.outfits[index], feedback: payload.feedback };
    const outfits = [...db.outfits];
    outfits[index] = updated;
    await writeDb({ ...db, outfits });
    return updated;
  },

  async markWorn(outfitId: string, note?: string): Promise<Outfit> {
    await delay(jitter(300));
    const db = await readDb();
    const index = db.outfits.findIndex((o) => o.id === outfitId);
    if (index === -1) throw new ApiError('not_found', 'Kombin bulunamadı.');

    const wornAt = new Date().toISOString();
    const updated: Outfit = {
      ...db.outfits[index],
      feedback: 'worn',
      wornAt,
      note: note ?? db.outfits[index].note,
    };

    const wornItemIds = new Set(updated.slots.map((s) => s.itemId));
    const items = db.items.map((item) =>
      wornItemIds.has(item.id)
        ? { ...item, wearCount: item.wearCount + 1, lastWornAt: wornAt }
        : item,
    );

    const outfits = [...db.outfits];
    outfits[index] = updated;
    await writeDb({ ...db, outfits, items });
    return updated;
  },

  async remove(outfitId: string): Promise<void> {
    await delay(200);
    const db = await readDb();
    await writeDb({ ...db, outfits: db.outfits.filter((o) => o.id !== outfitId) });
  },
};

/* ------------------------------------------------------------- assistant */

export const mockAssistant = {
  async thread(): Promise<ChatMessage[]> {
    await delay(150);
    const db = await readDb();
    return db.thread;
  },

  async chat(payload: AssistantRequest): Promise<ChatMessage> {
    await delay(jitter(1200));
    const db = await readDb();
    const reply = composeAssistantReply(payload, db);

    const userMessage: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      content: payload.message,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    await writeDb({ ...db, thread: [...db.thread, userMessage, reply] });
    return reply;
  },

  async clear(): Promise<void> {
    const db = await readDb();
    await writeDb({ ...db, thread: [] });
  },
};

const composeAssistantReply = (payload: AssistantRequest, db: MockDb): ChatMessage => {
  const text = payload.message.toLocaleLowerCase('tr-TR');
  const weather = buildMockWeather(
    db.user.location.latitude,
    db.user.location.longitude,
    db.user.location.city,
  );

  const base: ChatMessage = {
    id: createId('msg'),
    role: 'assistant',
    content: '',
    createdAt: new Date().toISOString(),
    status: 'sent',
  };

  // 1) "Bugün ne giysem" -> gerçek kombin üret
  if (/ne giy|bugün.*giy|kombin öner|kombin yap/.test(text)) {
    const outfit = generateOutfitLocally(
      {
        items: db.items,
        occasion: detectOccasion(text),
        weather,
        preferences: db.user.preferences,
      },
      db.user.id,
      todayKey(),
    );

    if (!outfit) {
      return {
        ...base,
        content:
          'Gardırobunda kombin kurmaya yetecek parça yok gibi görünüyor. Birkaç üst ve alt parça eklersen hemen öneri hazırlayabilirim.',
      };
    }

    return {
      ...base,
      content:
        `Bugün ${Math.round(weather.temperature)}°C ve ${weather.description.toLocaleLowerCase(
          'tr-TR',
        )}. ${outfit.summary} ${outfit.stylingTip ?? ''}`.trim(),
      suggestedOutfit: outfit,
      referencedItems: outfit.slots.map((slot) => slot.item),
    };
  }

  // 2) Belirli bir parçayı kombinleme sorusu
  const focusItem =
    (payload.focusItemId
      ? db.items.find((item) => item.id === payload.focusItemId)
      : undefined) ?? findItemByName(db.items, text);

  if (focusItem) {
    const partners = db.items
      .filter(
        (item) =>
          item.id !== focusItem.id &&
          item.category !== focusItem.category &&
          ['top', 'bottom', 'shoes', 'outerwear'].includes(item.category),
      )
      .slice(0, 3);

    const partnerText = partners.length
      ? partners.map((item) => item.name).join(', ')
      : 'gardırobundaki nötr parçalar';

    return {
      ...base,
      content: `${focusItem.name} için gardırobundan ${partnerText} çok iyi gider. ${
        focusItem.colors[0]?.name ?? 'Rengi'
      } tonunu nötr bir alt parçayla dengelemek en güvenli seçim. ${
        CATEGORY_MAP[focusItem.category]?.label ?? ''
      } parçanı ${STYLE_LABELS[focusItem.styles[0] ?? 'casual']} bir çizgide tutmanı öneririm.`,
      referencedItems: [focusItem, ...partners],
    };
  }

  // 3) Gardırop hakkında genel sorular
  if (/gardırop|kaç parça|neyim var/.test(text)) {
    const counts = Object.entries(
      db.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(
        ([key, count]) =>
          `${CATEGORY_MAP[key as ClothingItem['category']]?.label ?? key}: ${count}`,
      )
      .join(' · ');

    return {
      ...base,
      content: `Gardırobunda toplam ${db.items.length} parça var. ${counts}. Eksik gördüğüm bir kategori olursa öneri verebilirim.`,
    };
  }

  // 4) Hava durumu soruları
  if (/hava|sıcaklık|yağmur|kaç derece/.test(text)) {
    return {
      ...base,
      content: `${weather.city} için bugün ${Math.round(
        weather.temperature,
      )}°C, ${weather.description.toLocaleLowerCase('tr-TR')}. Hissedilen ${Math.round(
        weather.feelsLike,
      )}°C, yağış ihtimali %${weather.precipitationProbability}. ${
        weather.precipitationProbability > 40
          ? 'Su geçirmez bir dış giyim iyi olur.'
          : 'Katmanlı bir kombin bugün için ideal.'
      }`,
    };
  }

  return {
    ...base,
    content:
      'Sana yardımcı olabilirim! "Bugün ne giysem?", "Bu gömleği nasıl kombinlerim?" ya da "İş için bir kombin öner" gibi sorular sorabilirsin.',
  };
};

const detectOccasion = (text: string) => {
  const entries = Object.entries(OCCASION_MAP);
  const match = entries.find(([, meta]) =>
    text.includes(meta.label.toLocaleLowerCase('tr-TR')),
  );
  if (match) return match[0] as keyof typeof OCCASION_MAP;
  if (/iş|ofis|toplantı/.test(text)) return 'work' as const;
  if (/okul|üni|ders/.test(text)) return 'university' as const;
  if (/spor|antren|koş/.test(text)) return 'sport' as const;
  if (/yemek|akşam/.test(text)) return 'dinner' as const;
  return 'daily' as const;
};

const findItemByName = (items: ClothingItem[], text: string) =>
  items.find((item) => {
    const words = item.name.toLocaleLowerCase('tr-TR').split(' ');
    return words.some((word) => word.length > 3 && text.includes(word));
  });
