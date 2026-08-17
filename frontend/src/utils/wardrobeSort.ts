import { Ionicons } from '@expo/vector-icons';
import type { ClothingItem } from '../types/clothing';

export type WardrobeSort = 'recent' | 'name' | 'mostWorn' | 'leastWorn';

export interface WardrobeSortOption {
  key: WardrobeSort;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const WARDROBE_SORT_OPTIONS: WardrobeSortOption[] = [
  {
    key: 'recent',
    label: 'Son eklenen',
    hint: 'En yeni parçalar önce',
    icon: 'time-outline',
  },
  {
    key: 'mostWorn',
    label: 'En çok giyilen',
    hint: 'Gardırobun sadıkları',
    icon: 'flame-outline',
  },
  {
    key: 'leastWorn',
    label: 'En az giyilen',
    hint: 'Unuttuğun parçaları hatırlat',
    icon: 'moon-outline',
  },
  {
    key: 'name',
    label: 'İsme göre',
    hint: 'A’dan Z’ye',
    icon: 'text-outline',
  },
];

export const sortLabelFor = (sort: WardrobeSort) =>
  WARDROBE_SORT_OPTIONS.find((option) => option.key === sort)?.label ?? '';

const byDateDesc = (a?: string | null, b?: string | null) =>
  new Date(b ?? 0).getTime() - new Date(a ?? 0).getTime();

/** Sıralama saf: gelen dizi değiştirilmez, kopyası döner */
export const sortWardrobeItems = (
  items: ClothingItem[],
  sort: WardrobeSort,
): ClothingItem[] => {
  const sorted = [...items];

  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
    case 'mostWorn':
      // Eşitlikte en son giyilen öne gelir
      return sorted.sort(
        (a, b) => b.wearCount - a.wearCount || byDateDesc(a.lastWornAt, b.lastWornAt),
      );
    case 'leastWorn':
      // Hiç giyilmeyenler en başta; sonra en uzun süre önce giyilenler
      return sorted.sort(
        (a, b) => a.wearCount - b.wearCount || byDateDesc(b.lastWornAt, a.lastWornAt),
      );
    case 'recent':
    default:
      return sorted.sort((a, b) => byDateDesc(a.createdAt, b.createdAt));
  }
};
