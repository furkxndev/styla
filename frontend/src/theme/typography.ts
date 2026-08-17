import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontFamilyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

/**
 * Marka yazısı için yüksek kontrastlı serif.
 * Didot iOS'ta sistemle gelir ve uygulama ikonundaki monogramla aynı dili konuşur;
 * Android'de en yakın karşılık Noto Serif ('serif').
 */
const fontFamilyBrand = Platform.select({
  ios: 'Didot',
  android: 'serif',
  default: 'Georgia',
});

/**
 * Tek bir tipografi ölçeği. Ekranlarda ham fontSize yazmak yerine
 * `typography.title2` gibi hazır stiller kullanılır.
 *
 * Satır yükseklikleri bilinçli olarak açık tutuldu: mobilde yoğun kart
 * içeriğinde nefes payı okunurluğu doğrudan artırıyor. Harf aralıkları
 * inceltildi ki başlıklar sıkışık değil "yerleşmiş" görünsün.
 */
export const typography = {
  /** Yalnızca marka adı için: açılış ekranı ve karşılama sayfası */
  brand: {
    fontFamily: fontFamilyBrand,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: 6,
  },
  display: {
    fontFamily,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title1: {
    fontFamily,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  title2: {
    fontFamily,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  title3: {
    fontFamily: fontFamilyMedium,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  /** Büyük sayısal değerler (metrik kartları). Rakamlar sıkışmasın diye ls negatif. */
  metric: {
    fontFamily,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  bodyMedium: {
    fontFamily: fontFamilyMedium,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  callout: {
    fontFamily,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  caption: {
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    letterSpacing: 0,
  },
  /** Caption ile aynı boyut, daha güçlü: etiket/başlık rolü üstlenir */
  captionStrong: {
    fontFamily: fontFamilyMedium,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  overline: {
    fontFamily: fontFamilyMedium,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.85,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamilyMedium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
} satisfies Record<string, TextStyle>;

export type TypographyKey = keyof typeof typography;
