import type { Ionicons } from '@expo/vector-icons';
import type {
  ClothingCategory,
  Formality,
  Material,
  Pattern,
  Season,
  StyleTag,
} from '../types/clothing';

type IconName = keyof typeof Ionicons.glyphMap;

export interface CategoryMeta {
  key: ClothingCategory;
  label: string;
  icon: IconName;
  /** Kombin dizilişindeki sıra (üstten alta) */
  order: number;
  subcategories: string[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: 'outerwear',
    label: 'Dış Giyim',
    icon: 'snow-outline',
    order: 0,
    subcategories: ['Mont', 'Kaban', 'Ceket', 'Trençkot', 'Yağmurluk', 'Hırka', 'Yelek'],
  },
  {
    key: 'top',
    label: 'Üst Giyim',
    icon: 'shirt-outline',
    order: 1,
    subcategories: [
      'Tişört',
      'Gömlek',
      'Bluz',
      'Kazak',
      'Sweatshirt',
      'Body',
      'Atlet',
      'Polo',
    ],
  },
  {
    key: 'bottom',
    label: 'Alt Giyim',
    icon: 'layers-outline',
    order: 2,
    subcategories: [
      'Jean',
      'Pantolon',
      'Kumaş Pantolon',
      'Şort',
      'Etek',
      'Eşofman',
      'Tayt',
    ],
  },
  {
    key: 'dress',
    label: 'Elbise',
    icon: 'woman-outline',
    order: 3,
    subcategories: ['Günlük Elbise', 'Abiye', 'Tulum', 'Takım Elbise'],
  },
  {
    key: 'shoes',
    label: 'Ayakkabı',
    icon: 'footsteps-outline',
    order: 4,
    subcategories: [
      'Sneaker',
      'Klasik',
      'Bot',
      'Çizme',
      'Sandalet',
      'Loafer',
      'Topuklu',
      'Spor',
    ],
  },
  {
    key: 'bag',
    label: 'Çanta',
    icon: 'bag-handle-outline',
    order: 5,
    subcategories: ['Sırt Çantası', 'Omuz Çantası', 'El Çantası', 'Postacı'],
  },
  {
    key: 'accessory',
    label: 'Aksesuar',
    icon: 'watch-outline',
    order: 6,
    subcategories: ['Şapka', 'Atkı', 'Kemer', 'Saat', 'Gözlük', 'Takı', 'Eldiven'],
  },
  {
    key: 'other',
    label: 'Diğer',
    icon: 'ellipsis-horizontal-circle-outline',
    order: 7,
    subcategories: [],
  },
];

export const CATEGORY_MAP: Record<ClothingCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.key]: item }),
  {} as Record<ClothingCategory, CategoryMeta>,
);

export const getCategoryLabel = (key: ClothingCategory) =>
  CATEGORY_MAP[key]?.label ?? 'Diğer';

export const getCategoryIcon = (key: ClothingCategory): IconName =>
  CATEGORY_MAP[key]?.icon ?? 'ellipsis-horizontal-circle-outline';

export const STYLE_LABELS: Record<StyleTag, string> = {
  casual: 'Günlük',
  smart_casual: 'Smart Casual',
  formal: 'Klasik',
  sporty: 'Spor',
  streetwear: 'Sokak',
  bohem: 'Bohem',
  minimal: 'Minimal',
  vintage: 'Vintage',
  elegant: 'Şık',
};

export const STYLE_OPTIONS = Object.keys(STYLE_LABELS) as StyleTag[];

export const PATTERN_LABELS: Record<Pattern, string> = {
  solid: 'Düz',
  striped: 'Çizgili',
  checked: 'Ekose',
  floral: 'Çiçekli',
  polka_dot: 'Puantiye',
  graphic: 'Baskılı',
  animal: 'Animal',
  denim: 'Denim',
  other: 'Diğer',
};

export const PATTERN_OPTIONS = Object.keys(PATTERN_LABELS) as Pattern[];

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'İlkbahar',
  summer: 'Yaz',
  autumn: 'Sonbahar',
  winter: 'Kış',
};

export const SEASON_OPTIONS = Object.keys(SEASON_LABELS) as Season[];

export const MATERIAL_LABELS: Record<Material, string> = {
  cotton: 'Pamuk',
  wool: 'Yün',
  denim: 'Denim',
  leather: 'Deri',
  linen: 'Keten',
  silk: 'İpek',
  polyester: 'Polyester',
  knit: 'Triko',
  other: 'Diğer',
};

export const MATERIAL_OPTIONS = Object.keys(MATERIAL_LABELS) as Material[];

export const FORMALITY_LABELS: Record<Formality, string> = {
  1: 'Çok Rahat',
  2: 'Rahat',
  3: 'Dengeli',
  4: 'Şık',
  5: 'Resmi',
};
