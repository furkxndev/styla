import type { ClothingItem } from '../types/clothing';
import { getCategoryLabel, STYLE_LABELS } from '../constants/categories';

export const truncate = (value: string, max = 40) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const pluralize = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : (plural ?? singular)}`;

/** "Beyaz Gömlek · Üst Giyim" gibi ikincil satır metni */
export const itemSubtitle = (item: ClothingItem) => {
  const parts = [
    item.subcategory ?? getCategoryLabel(item.category),
    item.colors[0]?.name,
  ].filter(Boolean);
  return parts.join(' · ');
};

export const styleListLabel = (styles: ClothingItem['styles']) =>
  styles.map((style) => STYLE_LABELS[style] ?? style).join(', ');

export const initials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
