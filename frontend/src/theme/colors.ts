/**
 * Uygulama renk paleti.
 * Sıcak nötr tonlar + tek bir vurgu rengi -> sade ve premium bir his.
 * Karanlık tema ileride `dark` objesi doldurularak eklenebilir.
 */

export const palette = {
  // Nötrler
  ink900: '#141210',
  ink850: '#241F1B', // gövde metni: saf siyaha göre daha yumuşak, kontrast hâlâ ~13:1
  ink800: '#1F1B18',
  ink700: '#3A342E',
  ink500: '#6E6862',
  // WCAG AA: açıklama metinleri gövde metni sayılır, 4.5:1 gerekir (eski #9C958D = 2.72)
  ink400: '#766E66',
  // Dekoratif ikon/chevron için 3:1 (eski #C4BDB4 = 1.71)
  ink300: '#978B7B',
  // Kenarlıklar metin değildir; kontrast yerine görsel hafiflik önceliklidir
  ink250: '#D5CDC3',
  ink200: '#E7E2DB',
  ink150: '#EDE9E3', // yeni kart kenarlığı: zemine daha yakın, göz yormayan
  ink120: '#F2EFEA', // silik ayraç / iç bölüm kenarlığı
  ink100: '#F0EDE8',
  ink50: '#F7F5F2',
  ink25: '#FBFAF8', // kart içi ikincil yüzey
  white: '#FFFFFF',

  // Vurgu (terracotta)
  accent600: '#A85A2C',
  accent500: '#C2703C',
  accent400: '#C38F6C', // doygunluğu düşürülmüş vurgu: dekoratif çizgi/ikon için
  accent300: '#E5B590',
  accent100: '#F7E9DD',

  // Durum renkleri
  success: '#3E7C5A',
  successSoft: '#E4F0E9',
  warning: '#926923',
  warningSoft: '#FBF0DC',
  danger: '#B4453A',
  dangerSoft: '#F8E5E3',
  info: '#3B6E8F',
  infoSoft: '#E3EEF5',
} as const;

export const colors = {
  background: palette.ink50,
  surface: palette.white,
  /** Kartların içindeki ikincil bölümler (satır grupları, metrik blokları) */
  surfaceSubtle: palette.ink25,
  surfaceAlt: palette.ink100,
  surfaceInverse: palette.ink800,

  text: palette.ink850,
  textSecondary: palette.ink500,
  textTertiary: palette.ink400,
  /** En düşük hiyerarşi: yalnızca dekoratif/yardımcı bilgi, uzun metin için kullanma */
  textQuaternary: palette.ink300,
  textInverse: palette.white,

  border: palette.ink150,
  /** Kart içi ayraçlar: neredeyse görünmez, sadece ritim verir */
  borderSubtle: palette.ink120,
  borderStrong: palette.ink250,

  primary: palette.ink800,
  primaryText: palette.white,

  accent: palette.accent500,
  accentDark: palette.accent600,
  accentSoft: palette.accent100,
  /** Doygunluğu düşük vurgu: ikon/çizgi gibi büyük alanlarda göz yormaz */
  accentMuted: palette.accent400,

  success: palette.success,
  successSoft: palette.successSoft,
  warning: palette.warning,
  warningSoft: palette.warningSoft,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  info: palette.info,
  infoSoft: palette.infoSoft,

  overlay: 'rgba(20, 18, 16, 0.45)',
  /** Hafif karartma: sheet yerine popover/press efektlerinde */
  overlaySoft: 'rgba(20, 18, 16, 0.16)',
  skeleton: palette.ink100,
} as const;

/** Hava durumuna göre ana sayfa gradyanları */
export const weatherGradients: Record<string, [string, string]> = {
  clear: ['#F3C77B', '#E39B4A'],
  clouds: ['#B9C2CC', '#8B97A5'],
  rain: ['#8FA3B8', '#5E738C'],
  drizzle: ['#9FB3C6', '#6E8399'],
  thunderstorm: ['#6C6F86', '#3E4157'],
  snow: ['#D9E4EE', '#A9BCD0'],
  mist: ['#C6C9CC', '#9AA0A6'],
  default: ['#C9B9A6', '#9A8674'],
};

export type ColorKey = keyof typeof colors;
