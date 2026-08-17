import { Ionicons } from '@expo/vector-icons';

export interface AssistantPrompt {
  id: string;
  /** Kartta görünen kısa başlık */
  title: string;
  /** Başlığın altındaki açıklama: soruyu sormadan ne olacağını anlatır */
  hint: string;
  /** Asistana gönderilen tam soru */
  question: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * Sohbet boşken gösterilen başlangıç soruları.
 * Sıra bilinçli: en sık kullanılan ("bugün ne giysem") en üstte.
 */
export const ASSISTANT_PROMPTS: AssistantPrompt[] = [
  {
    id: 'today',
    title: 'Bugün ne giysem?',
    hint: 'Hava ve planına göre',
    question: 'Bugün ne giysem?',
    icon: 'sunny-outline',
  },
  {
    id: 'work',
    title: 'İş için kombin',
    hint: 'Ofise uygun, derli toplu',
    question: 'İş için bir kombin öner',
    icon: 'briefcase-outline',
  },
  {
    id: 'evening',
    title: 'Akşam planı',
    hint: 'Yemek, buluşma, davet',
    question: 'Akşam yemeği için bir kombin öner',
    icon: 'wine-outline',
  },
  {
    id: 'weather',
    title: 'Havaya uygun mu?',
    hint: 'Bugünkü dereceye göre',
    question: 'Bu havaya ne uygun?',
    icon: 'cloud-outline',
  },
  {
    id: 'colors',
    title: 'Renk uyumu',
    hint: 'Neyi neyle giyebilirim',
    question: 'Gardırobumdaki renkleri nasıl eşleştirebilirim?',
    icon: 'color-palette-outline',
  },
  {
    id: 'wardrobe',
    title: 'Gardırop özeti',
    hint: 'Nelerim var, ne eksik',
    question: 'Gardırobumda ne var, ne eksik?',
    icon: 'grid-outline',
  },
];

/** Sohbet sürerken composer üstünde duran kısa öneri şeridi */
export const DEFAULT_SUGGESTIONS = ASSISTANT_PROMPTS.map((prompt) => prompt.question);
