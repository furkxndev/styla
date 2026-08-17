import type { ClothingColor, ColorFamily } from '../types/clothing';

/** Kullanıcının ürün düzenlerken seçebileceği hazır renkler */
export const COLOR_PRESETS: ClothingColor[] = [
  { name: 'Siyah', hex: '#111111', family: 'black' },
  { name: 'Beyaz', hex: '#FFFFFF', family: 'white' },
  { name: 'Kırık Beyaz', hex: '#F2EDE4', family: 'white' },
  { name: 'Gri', hex: '#8A8A8E', family: 'gray' },
  { name: 'Antrasit', hex: '#3C3F43', family: 'gray' },
  { name: 'Bej', hex: '#D9C3A5', family: 'beige' },
  { name: 'Camel', hex: '#B98B50', family: 'beige' },
  { name: 'Kahverengi', hex: '#6B4A32', family: 'brown' },
  { name: 'Lacivert', hex: '#1F2E4A', family: 'navy' },
  { name: 'Mavi', hex: '#3B72C4', family: 'blue' },
  { name: 'Açık Mavi', hex: '#A8C8E8', family: 'blue' },
  { name: 'Denim', hex: '#4A6E96', family: 'blue' },
  { name: 'Yeşil', hex: '#3F7A52', family: 'green' },
  { name: 'Haki', hex: '#6E7250', family: 'green' },
  { name: 'Kırmızı', hex: '#B4342C', family: 'red' },
  { name: 'Bordo', hex: '#6E2634', family: 'red' },
  { name: 'Pembe', hex: '#E0A0B4', family: 'pink' },
  { name: 'Mor', hex: '#6B4E8C', family: 'purple' },
  { name: 'Sarı', hex: '#E0B93C', family: 'yellow' },
  { name: 'Turuncu', hex: '#D4783C', family: 'orange' },
  { name: 'Çok Renkli', hex: '#9A8674', family: 'multi' },
];

export const COLOR_FAMILY_LABELS: Record<ColorFamily, string> = {
  black: 'Siyah',
  white: 'Beyaz',
  gray: 'Gri',
  beige: 'Bej',
  brown: 'Kahve',
  navy: 'Lacivert',
  blue: 'Mavi',
  green: 'Yeşil',
  red: 'Kırmızı',
  pink: 'Pembe',
  purple: 'Mor',
  yellow: 'Sarı',
  orange: 'Turuncu',
  multi: 'Çok Renkli',
};

export const COLOR_FAMILY_OPTIONS = Object.keys(COLOR_FAMILY_LABELS) as ColorFamily[];

/** Renk ailesi -> temsili hex (filtre noktaları için) */
export const COLOR_FAMILY_HEX: Record<ColorFamily, string> = {
  black: '#111111',
  white: '#FFFFFF',
  gray: '#8A8A8E',
  beige: '#D9C3A5',
  brown: '#6B4A32',
  navy: '#1F2E4A',
  blue: '#3B72C4',
  green: '#3F7A52',
  red: '#B4342C',
  pink: '#E0A0B4',
  purple: '#6B4E8C',
  yellow: '#E0B93C',
  orange: '#D4783C',
  multi: '#9A8674',
};
