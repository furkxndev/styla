import type { Ionicons } from '@expo/vector-icons';
import type { Occasion } from '../types/outfit';

type IconName = keyof typeof Ionicons.glyphMap;

export interface OccasionMeta {
  key: Occasion;
  label: string;
  /** Kutucuklarda kullanılan kısa ad (tek satıra sığar) */
  shortLabel: string;
  description: string;
  icon: IconName;
  /** AI'a gönderilen resmiyet hedefi (1-5) */
  targetFormality: number;
}

export const OCCASIONS: OccasionMeta[] = [
  {
    key: 'daily',
    label: 'Günlük',
    shortLabel: 'Günlük',
    description: 'Sıradan bir gün için rahat ve dengeli',
    icon: 'sunny-outline',
    targetFormality: 2,
  },
  {
    key: 'university',
    label: 'Üniversite',
    shortLabel: 'Üniversite',
    description: 'Derste rahat, kampüste şık',
    icon: 'school-outline',
    targetFormality: 2,
  },
  {
    key: 'work',
    label: 'İş',
    shortLabel: 'İş',
    description: 'Ofis için düzenli ve profesyonel',
    icon: 'briefcase-outline',
    targetFormality: 4,
  },
  {
    key: 'sport',
    label: 'Spor',
    shortLabel: 'Spor',
    description: 'Hareket özgürlüğü ve nefes alan kumaşlar',
    icon: 'barbell-outline',
    targetFormality: 1,
  },
  {
    key: 'friends',
    label: 'Arkadaş Buluşması',
    shortLabel: 'Buluşma',
    description: 'Rahat ama iddialı',
    icon: 'people-outline',
    targetFormality: 3,
  },
  {
    key: 'dinner',
    label: 'Akşam Yemeği',
    shortLabel: 'Yemek',
    description: 'Akşama uygun, biraz daha şık',
    icon: 'restaurant-outline',
    targetFormality: 4,
  },
  {
    key: 'special_event',
    label: 'Özel Etkinlik',
    shortLabel: 'Etkinlik',
    description: 'Davet, kutlama, özel gün',
    icon: 'sparkles-outline',
    targetFormality: 5,
  },
  {
    key: 'travel',
    label: 'Seyahat',
    shortLabel: 'Seyahat',
    description: 'Uzun saatler için konfor odaklı',
    icon: 'airplane-outline',
    targetFormality: 2,
  },
];

export const OCCASION_MAP: Record<Occasion, OccasionMeta> = OCCASIONS.reduce(
  (acc, item) => ({ ...acc, [item.key]: item }),
  {} as Record<Occasion, OccasionMeta>,
);

export const getOccasionLabel = (key: Occasion) => OCCASION_MAP[key]?.label ?? 'Günlük';

export const getOccasionIcon = (key: Occasion): IconName =>
  OCCASION_MAP[key]?.icon ?? 'sunny-outline';

export const DISLIKE_REASONS: { key: string; label: string }[] = [
  { key: 'colors', label: 'Renkler uymadı' },
  { key: 'style', label: 'Stilim değil' },
  { key: 'weather', label: 'Havaya uygun değil' },
  { key: 'occasion', label: 'Duruma uygun değil' },
  { key: 'repetitive', label: 'Çok sık öneriliyor' },
  { key: 'other', label: 'Diğer' },
];
