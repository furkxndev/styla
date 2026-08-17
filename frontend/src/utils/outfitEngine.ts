import { OCCASION_MAP } from '../constants/occasions';
import type { ClothingItem, Season } from '../types/clothing';
import type { Occasion, Outfit, OutfitScore, OutfitSlot } from '../types/outfit';
import type { StylePreferences } from '../types/user';
import type { WeatherSnapshot } from '../types/weather';
import { colorHarmonyScore } from './color';
import { getOccasionStyleBias } from './styleRules';
import { buildWeatherAdvice, temperatureToSeason } from './weather';
import { createId } from './id';
import { clamp } from './format';

/**
 * Kural tabanlı kombin motoru.
 *
 * Bu motor iki işi görür:
 *  1) Backend hazır olana kadar mock API'nin kombin üretmesini sağlar.
 *  2) Backend/AI erişilemediğinde çevrimdışı yedek (fallback) olarak çalışır.
 *
 * Gerçek kişiselleştirme backend'deki LLM + öğrenme katmanında yapılır;
 * buradaki skorlama arayüzdeki "neden bu kombin" açıklamalarıyla aynı dili konuşur.
 */

export interface OutfitEngineInput {
  items: ClothingItem[];
  occasion: Occasion;
  weather?: WeatherSnapshot;
  preferences?: StylePreferences;
  /** Kullanıcının beğenmediği ürün id'leri (geri bildirimden öğrenilen) */
  penalizedItemIds?: string[];
  /** Beğenilen ürün id'leri */
  boostedItemIds?: string[];
  excludeItemIds?: string[];
  pinnedItemIds?: string[];
  seed?: number;
}

const SENSITIVITY_OFFSET: Record<StylePreferences['temperatureSensitivity'], number> = {
  cold: 3,
  neutral: 0,
  warm: -3,
};

/** Deterministik ama çeşitlilik veren rastgelelik */
const seededShuffle = <T>(list: T[], seed: number): T[] => {
  const arr = [...list];
  let state = seed || 1;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const seasonMatches = (item: ClothingItem, season: Season) =>
  item.seasons.length === 0 || item.seasons.includes(season);

const temperatureMatches = (item: ClothingItem, feelsLike: number, offset: number) => {
  const target = feelsLike + offset;
  return target >= item.temperatureRange.min - 4 && target <= item.temperatureRange.max + 4;
};

/** Hedef sıcaklığın ürün aralığına uzaklığı (aralık içindeyse 0) */
const temperatureDistance = (item: ClothingItem, feelsLike: number, offset: number) => {
  const target = feelsLike + offset;
  if (target < item.temperatureRange.min) return item.temperatureRange.min - target;
  if (target > item.temperatureRange.max) return target - item.temperatureRange.max;
  return 0;
};

/** Spor kombininde üst/alt/ayakkabı mutlaka sporcu parçalardan seçilmeli */
const SPORT_CRITICAL_CATEGORIES: ClothingItem['category'][] = ['top', 'bottom', 'shoes'];

interface ScoredItem {
  item: ClothingItem;
  score: number;
}

const scoreItem = (
  item: ClothingItem,
  input: OutfitEngineInput,
  season: Season,
  feelsLike: number,
  offset: number,
): number => {
  let score = 50;

  // Mevsim uyumu: uymayan parça ciddi şekilde geriye düşer
  if (seasonMatches(item, season)) score += 18;
  else score -= 22;

  // Sıcaklık uyumu: aralık dışına çıktıkça artan ceza (yazın kaşmir kazak önerilmesin)
  const distance = temperatureDistance(item, feelsLike, offset);
  if (distance === 0) score += 20;
  else score -= Math.min(50, distance * 5);

  const targetFormality = OCCASION_MAP[input.occasion]?.targetFormality ?? 3;
  score -= Math.abs(item.formality - targetFormality) * 7;

  const styleBias = getOccasionStyleBias(input.occasion);
  if (item.styles.some((style) => styleBias.includes(style))) score += 14;

  // Spor kombininde spor olmayan üst/alt/ayakkabı seçilmesin
  if (
    input.occasion === 'sport' &&
    SPORT_CRITICAL_CATEGORIES.includes(item.category) &&
    !item.styles.includes('sporty')
  ) {
    score -= 30;
  }

  const favoriteStyles = input.preferences?.favoriteStyles ?? [];
  if (item.styles.some((style) => favoriteStyles.includes(style))) score += 8;

  const avoided = input.preferences?.avoidedColors ?? [];
  if (item.colors.some((color) => avoided.includes(color.family))) score -= 22;

  if (item.isFavorite) score += 6;
  if (input.boostedItemIds?.includes(item.id)) score += 14;
  if (input.penalizedItemIds?.includes(item.id)) score -= 20;

  // Çeşitlilik: son giyilenleri biraz geriye it
  if (item.lastWornAt) {
    const days = (Date.now() - new Date(item.lastWornAt).getTime()) / 86400000;
    if (days < 2) score -= 18;
    else if (days < 5) score -= 8;
    else if (days > 21) score += 6;
  } else {
    score += 4; // hiç giyilmemiş parçaya küçük teşvik
  }

  return score;
};

/**
 * En iyi adaylar arasından seçer.
 * Çeşitlilik için rastgelelik vardır ama yalnızca skoru en iyiye yakın
 * (varsayılan 10 puan) adaylar havuza girer — böylece "kaliteli ama farklı"
 * kombinler üretilir, kötü parçalar öne çıkmaz.
 */
const pick = (
  candidates: ScoredItem[],
  seed: number,
  topN = 3,
  tolerance = 10,
): ClothingItem | undefined => {
  if (!candidates.length) return undefined;
  const best = candidates[0].score;
  const pool = candidates
    .filter((candidate) => best - candidate.score <= tolerance)
    .slice(0, Math.max(1, topN));
  return seededShuffle(pool, seed)[0]?.item;
};

const buildReason = (item: ClothingItem, occasion: Occasion, weather?: WeatherSnapshot) => {
  const bits: string[] = [];
  if (weather) {
    const t = Math.round(weather.feelsLike);
    if (t <= item.temperatureRange.max && t >= item.temperatureRange.min) {
      bits.push(`${t}°C için ideal`);
    }
  }
  const occasionLabel = OCCASION_MAP[occasion]?.label;
  if (occasionLabel) bits.push(`${occasionLabel.toLocaleLowerCase('tr-TR')} için uygun`);
  if (item.isFavorite) bits.push('favorilerinden');
  return bits.slice(0, 2).join(' · ');
};

const computeScore = (
  slots: OutfitSlot[],
  input: OutfitEngineInput,
  season: Season,
  feelsLike: number,
  offset: number,
): OutfitScore => {
  const items = slots.map((slot) => slot.item);
  const colorHarmony = colorHarmonyScore(items.flatMap((item) => item.colors.slice(0, 2)));

  const targetFormality = OCCASION_MAP[input.occasion]?.targetFormality ?? 3;
  const formalitySpread =
    items.reduce((sum, item) => sum + Math.abs(item.formality - targetFormality), 0) /
    Math.max(1, items.length);
  const styleCoherence = clamp(Math.round(100 - formalitySpread * 18), 0, 100);

  const temperatureFit =
    items.reduce(
      (sum, item) =>
        sum + Math.max(0, 100 - temperatureDistance(item, feelsLike, offset) * 12),
      0,
    ) / Math.max(1, items.length);
  const seasonFit =
    (items.filter((item) => seasonMatches(item, season)).length /
      Math.max(1, items.length)) *
    100;
  const weatherFit = clamp(Math.round(temperatureFit * 0.65 + seasonFit * 0.35), 0, 100);

  const favoriteStyles = input.preferences?.favoriteStyles ?? [];
  const matched = items.filter((item) =>
    item.styles.some((style) => favoriteStyles.includes(style)),
  ).length;
  const boosted = items.filter((item) => input.boostedItemIds?.includes(item.id)).length;
  const personalPreference = clamp(
    Math.round(55 + (matched / Math.max(1, items.length)) * 30 + boosted * 8),
    0,
    100,
  );

  const overall = Math.round(
    colorHarmony * 0.28 +
      styleCoherence * 0.24 +
      weatherFit * 0.3 +
      personalPreference * 0.18,
  );

  return { colorHarmony, styleCoherence, weatherFit, personalPreference, overall };
};

const buildSummary = (
  slots: OutfitSlot[],
  occasion: Occasion,
  weather?: WeatherSnapshot,
): string => {
  const main = slots.find((s) => s.role === 'dress') ?? slots.find((s) => s.role === 'top');
  const bottom = slots.find((s) => s.role === 'bottom');
  const outer = slots.find((s) => s.role === 'outerwear');
  const lower = (value: string) => value.toLocaleLowerCase('tr-TR');
  const occasionLabel = lower(OCCASION_MAP[occasion]?.label ?? 'gün');

  const pieces: string[] = [];
  if (main) pieces.push(lower(main.item.name));
  if (bottom) pieces.push(lower(bottom.item.name));
  if (outer) pieces.push(`üzerine ${lower(outer.item.name)}`);

  const weatherPart = weather
    ? `${Math.round(weather.temperature)}°C ve ${lower(weather.description)} havaya göre`
    : 'bugüne göre';

  return `${weatherPart} ${occasionLabel} için ${pieces.join(', ')} seçtim.`;
};

const buildStylingTip = (slots: OutfitSlot[], weather?: WeatherSnapshot): string => {
  if (weather) {
    const advice = buildWeatherAdvice(weather);
    if (advice.needsRainProtection) return 'Yanına küçük bir şemsiye almayı unutma.';
    if (advice.needsWindProtection) return 'Rüzgâr için dış giyimini kapalı tut.';
  }
  const hasAccessory = slots.some((s) => s.role === 'accessory');
  if (!hasAccessory) return 'Sade bir aksesuar kombini bir tık yukarı taşır.';
  return 'Üst parçanı hafifçe içine sokmak siluetini toparlar.';
};

export const generateOutfitLocally = (
  input: OutfitEngineInput,
  userId: string,
  date: string,
): Outfit | null => {
  const seed = input.seed ?? Math.floor(Math.random() * 100000) + 1;
  const feelsLike = input.weather?.feelsLike ?? 20;
  const season = input.weather
    ? temperatureToSeason(feelsLike)
    : temperatureToSeason(feelsLike);
  const offset = SENSITIVITY_OFFSET[input.preferences?.temperatureSensitivity ?? 'neutral'];
  const advice = input.weather ? buildWeatherAdvice(input.weather) : null;

  const excluded = new Set(input.excludeItemIds ?? []);
  const usable = input.items.filter((item) => !excluded.has(item.id));

  const byCategory = (category: ClothingItem['category']): ScoredItem[] =>
    usable
      .filter((item) => item.category === category)
      .map((item) => ({
        item,
        score: scoreItem(item, input, season, feelsLike, offset),
      }))
      .sort((a, b) => b.score - a.score);

  const pinned = new Set(input.pinnedItemIds ?? []);
  const pinnedOf = (category: ClothingItem['category']) =>
    usable.find((item) => pinned.has(item.id) && item.category === category);

  const slots: OutfitSlot[] = [];
  const pushSlot = (role: OutfitSlot['role'], item?: ClothingItem) => {
    if (!item) return;
    slots.push({
      role,
      itemId: item.id,
      item,
      reason: buildReason(item, input.occasion, input.weather),
    });
  };

  // Elbise mi, üst+alt mı?
  const dressCandidates = byCategory('dress');
  const topCandidates = byCategory('top');
  const bottomCandidates = byCategory('bottom');

  const preferDress =
    dressCandidates.length > 0 &&
    (pinnedOf('dress') !== undefined ||
      (['dinner', 'special_event'].includes(input.occasion) && seed % 2 === 0) ||
      topCandidates.length === 0 ||
      bottomCandidates.length === 0);

  if (preferDress) {
    pushSlot('dress', pinnedOf('dress') ?? pick(dressCandidates, seed));
  } else {
    pushSlot('top', pinnedOf('top') ?? pick(topCandidates, seed));
    pushSlot('bottom', pinnedOf('bottom') ?? pick(bottomCandidates, seed + 7));
  }

  pushSlot('shoes', pinnedOf('shoes') ?? pick(byCategory('shoes'), seed + 13));

  const needsOuterwear = advice?.needsOuterwear ?? feelsLike <= 17;
  if (needsOuterwear || pinnedOf('outerwear')) {
    pushSlot(
      'outerwear',
      pinnedOf('outerwear') ?? pick(byCategory('outerwear'), seed + 21),
    );
  }

  const bag = pinnedOf('bag') ?? pick(byCategory('bag'), seed + 29, 2);
  if (bag && ['work', 'university', 'travel', 'daily'].includes(input.occasion)) {
    pushSlot('bag', bag);
  }

  const accessory = pinnedOf('accessory') ?? pick(byCategory('accessory'), seed + 37, 3);
  if (accessory) pushSlot('accessory', accessory);

  // Geçerli bir kombin en az bir üst gövde ve bir alt/elbise parçası içermeli
  const hasCore =
    slots.some((s) => s.role === 'dress') ||
    (slots.some((s) => s.role === 'top') && slots.some((s) => s.role === 'bottom'));
  if (!hasCore) return null;

  const score = computeScore(slots, input, season, feelsLike, offset);

  return {
    id: createId('outfit'),
    userId,
    date,
    occasion: input.occasion,
    slots,
    summary: buildSummary(slots, input.occasion, input.weather),
    stylingTip: buildStylingTip(slots, input.weather),
    score,
    weather: input.weather,
    feedback: null,
    wornAt: null,
    isGeneratedByAI: true,
    createdAt: new Date().toISOString(),
  };
};

/** Kombin oluşturmak için gereken minimum gardırop kontrolü */
export const canGenerateOutfit = (items: ClothingItem[]) => {
  const hasDress = items.some((item) => item.category === 'dress');
  const hasTop = items.some((item) => item.category === 'top');
  const hasBottom = items.some((item) => item.category === 'bottom');
  return hasDress || (hasTop && hasBottom);
};

export const missingCategoriesFor = (items: ClothingItem[]): string[] => {
  const missing: string[] = [];
  if (!items.some((i) => i.category === 'top')) missing.push('Üst Giyim');
  if (!items.some((i) => i.category === 'bottom')) missing.push('Alt Giyim');
  if (!items.some((i) => i.category === 'shoes')) missing.push('Ayakkabı');
  return missing;
};
