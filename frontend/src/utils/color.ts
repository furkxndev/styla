import type { ClothingColor, ColorFamily } from '../types/clothing';

/** #RGB / #RRGGBB -> {r,g,b} */
export const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

/** Arka plan rengine göre okunur metin rengi seçer */
export const getReadableTextColor = (hex: string, dark = '#141210', light = '#FFFFFF') => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? dark : light;
};

export const withAlpha = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Her şeyle uyumlu kabul edilen nötr renkler */
const NEUTRALS: ColorFamily[] = ['black', 'white', 'gray', 'beige', 'navy'];

export const isNeutral = (family: ColorFamily) => NEUTRALS.includes(family);

/** Renk çemberi üzerinde uyumlu kabul edilen aileler */
const HARMONY_MAP: Partial<Record<ColorFamily, ColorFamily[]>> = {
  blue: ['beige', 'white', 'gray', 'brown', 'navy', 'orange'],
  navy: ['beige', 'white', 'brown', 'gray', 'red'],
  green: ['beige', 'brown', 'white', 'navy', 'yellow'],
  red: ['black', 'white', 'navy', 'beige', 'gray'],
  pink: ['white', 'gray', 'navy', 'beige', 'brown'],
  purple: ['gray', 'white', 'black', 'beige'],
  yellow: ['navy', 'gray', 'white', 'brown', 'green'],
  orange: ['navy', 'blue', 'brown', 'white', 'beige'],
  brown: ['beige', 'white', 'green', 'blue', 'navy'],
  beige: ['brown', 'navy', 'white', 'black', 'green'],
};

/**
 * İki renk ailesinin uyumunu 0-100 arası puanlar.
 * Not: Nihai kombin skoru backend/AI tarafından üretilir; bu fonksiyon
 * arayüzde anlık ipucu göstermek ve mock modda çalışmak için kullanılır.
 */
export const colorPairScore = (a: ColorFamily, b: ColorFamily): number => {
  if (a === b) return 85;
  if (isNeutral(a) || isNeutral(b)) return 90;
  if (HARMONY_MAP[a]?.includes(b) || HARMONY_MAP[b]?.includes(a)) return 80;
  if (a === 'multi' || b === 'multi') return 60;
  return 45;
};

/** Bir kombindeki tüm renklerin ortalama uyum skoru */
export const colorHarmonyScore = (colors: ClothingColor[]): number => {
  const families = colors.map((c) => c.family);
  if (families.length < 2) return 90;

  let total = 0;
  let pairs = 0;
  for (let i = 0; i < families.length; i += 1) {
    for (let j = i + 1; j < families.length; j += 1) {
      total += colorPairScore(families[i], families[j]);
      pairs += 1;
    }
  }
  const base = pairs ? total / pairs : 80;

  // Aynı kombinde 4'ten fazla farklı renk ailesi varsa ceza uygula
  const uniqueFamilies = new Set(families.filter((f) => !isNeutral(f))).size;
  const penalty = uniqueFamilies > 3 ? (uniqueFamilies - 3) * 8 : 0;

  return Math.max(0, Math.min(100, Math.round(base - penalty)));
};

export const primaryColorOf = (colors: ClothingColor[]): ClothingColor =>
  colors[0] ?? { name: 'Nötr', hex: '#9C958D', family: 'gray' };
