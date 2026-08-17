/** Gardıroptaki bir ürünün tip tanımları. Backend sözleşmesi ile birebir aynıdır. */

export type ClothingCategory =
  | 'top' // üst giyim
  | 'bottom' // alt giyim
  | 'outerwear' // dış giyim
  | 'dress' // elbise / tulum
  | 'shoes' // ayakkabı
  | 'accessory' // aksesuar
  | 'bag' // çanta
  | 'other';

export type ClothingSubcategory = string;

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

/** Ürünün kaç derecelik havada rahat giyilebileceği aralığı */
export interface TemperatureRange {
  min: number;
  max: number;
}

export interface ClothingColor {
  /** Kullanıcıya gösterilen ad: "Lacivert" */
  name: string;
  /** #RRGGBB */
  hex: string;
  /** Renk uyumu hesapları için baz renk ailesi */
  family: ColorFamily;
}

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

export interface ClothingItem {
  id: string;
  userId: string;
  imageUrl: string;
  /** Arka planı temizlenmiş görsel (backend üretir, opsiyonel) */
  thumbnailUrl?: string;
  name: string;
  category: ClothingCategory;
  subcategory?: ClothingSubcategory;
  colors: ClothingColor[];
  pattern: Pattern;
  styles: StyleTag[];
  seasons: Season[];
  materials?: Material[];
  /** 1 = çok rahat, 5 = çok resmi */
  formality: Formality;
  temperatureRange: TemperatureRange;
  brand?: string;
  notes?: string;
  isFavorite: boolean;
  /** Kaç kez giyildi (istatistikler ve öneri çeşitliliği için) */
  wearCount: number;
  lastWornAt?: string | null;
  /** AI analizinin güven skoru 0-1 */
  aiConfidence?: number;
  /** Kullanıcı AI analizini düzenlediyse true */
  isUserEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

/** AI görsel analizi sonucu (kullanıcı onaylamadan önceki taslak) */
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

export interface CreateClothingItemPayload extends Omit<
  ClothingItem,
  | 'id'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
  | 'wearCount'
  | 'lastWornAt'
  | 'isUserEdited'
  | 'isFavorite'
> {
  isFavorite?: boolean;
}

export type UpdateClothingItemPayload = Partial<CreateClothingItemPayload>;

export interface WardrobeFilters {
  category?: ClothingCategory | 'all';
  season?: Season;
  colorFamily?: ColorFamily;
  style?: StyleTag;
  favoritesOnly?: boolean;
  query?: string;
}
