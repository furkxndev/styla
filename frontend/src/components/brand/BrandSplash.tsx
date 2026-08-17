import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { MARK_SIZE, StylaMark } from './StylaMark';

/** Marka en az bu kadar görünür kalır; veri erken hazır olsa da animasyon kesilmez */
const MIN_VISIBLE_MS = 1500;

/**
 * Yazı bloğu açıldığında kompozisyonun ağırlık merkezi aşağı kayar; grup bu
 * kadar yukarı süzülerek optik olarak ortalanır. İşaret native splash'taki
 * konumunda BAŞLAR, sonra yükselir — devir teslim karesi bozulmaz.
 */
const GROUP_LIFT = -46;

interface BrandSplashProps {
  /** Uygulama verisi hazır mı (oturum + önbellek okundu) */
  ready: boolean;
  /** Kapanış animasyonu bitti, katman kaldırılabilir */
  onFinish: () => void;
  /** İlk kare çizildi — native splash bu anda gizlenir (beyaz flaş olmaz) */
  onFirstFrame?: () => void;
}

/**
 * Giriş animasyonu.
 *
 * Native açılış ekranındaki monogramla aynı noktada, aynı boyutta başlar; sonra
 * kelime işareti ve çizgi açılırken grup optik merkeze süzülür. Devir teslim
 * karesi birebir örtüştüğü için native splash'tan uygulamaya geçiş tek bir
 * kesintisiz hareket gibi görünür.
 */
export const BrandSplash: React.FC<BrandSplashProps> = ({
  ready,
  onFinish,
  onFirstFrame,
}) => {
  const markScale = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(10)).current;
  // letterSpacing yerel sürücüyle animasyon edilemez; ayrı değerde tutuluyor
  const letterSpacing = useRef(new Animated.Value(16)).current;
  const ruleScale = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const overlayFade = useRef(new Animated.Value(1)).current;
  const groupLift = useRef(new Animated.Value(0)).current;

  const shownAt = useRef(Date.now());
  const firstFrameSent = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const handleFirstFrame = useCallback(
    (_: LayoutChangeEvent) => {
      if (firstFrameSent.current) return;
      firstFrameSent.current = true;
      onFirstFrame?.();
    },
    [onFirstFrame],
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  /** Giriş: işaret yerinde nefes alır, yazı ve çizgi sırayla açılır */
  useEffect(() => {
    if (reduceMotion) {
      textFade.setValue(1);
      textShift.setValue(0);
      letterSpacing.setValue(6);
      ruleScale.setValue(1);
      taglineFade.setValue(1);
      groupLift.setValue(GROUP_LIFT);
      return;
    }

    const intro = Animated.parallel([
      Animated.sequence([
        Animated.timing(markScale, {
          toValue: 1.06,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(markScale, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(textFade, {
            toValue: 1,
            duration: 460,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textShift, {
            toValue: 0,
            duration: 460,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Grup, yazıyla birlikte optik merkeze doğru süzülür
          Animated.timing(groupLift, {
            toValue: GROUP_LIFT,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Harf aralığının toplanması: moda markalarının klasik açılış hareketi
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(letterSpacing, {
          toValue: 6,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.delay(440),
        Animated.timing(ruleScale, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(620),
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
    ]);

    intro.start();
    return () => intro.stop();
  }, [
    markScale,
    textFade,
    textShift,
    letterSpacing,
    ruleScale,
    taglineFade,
    groupLift,
    reduceMotion,
  ]);

  /** Çıkış: veri hazır olduğunda katman hafifçe yükselerek kaybolur */
  useEffect(() => {
    if (!ready) return;

    const elapsed = Date.now() - shownAt.current;
    const wait = reduceMotion ? 0 : Math.max(0, MIN_VISIBLE_MS - elapsed);

    const exit = Animated.sequence([
      Animated.delay(wait),
      Animated.parallel([
        Animated.timing(overlayFade, {
          toValue: 0,
          duration: reduceMotion ? 180 : 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Perde kalkarken grup bir tık daha yükselir: "yukarı çekilme" hissi
        Animated.timing(groupLift, {
          toValue: GROUP_LIFT - (reduceMotion ? 0 : 14),
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    exit.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => exit.stop();
  }, [ready, reduceMotion, overlayFade, groupLift, onFinish]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayFade }]}
      onLayout={handleFirstFrame}
      accessibilityLabel="Styla açılıyor"
      accessibilityRole="progressbar"
      pointerEvents="none"
    >
      <Animated.View style={[styles.center, { transform: [{ translateY: groupLift }] }]}>
        {/* Sabit ölçülü kutu: yazı bloğu mutlak konumlandığı için işaretin
            başlangıç yerini etkilemez (native splash ile aynı noktada durur) */}
        <View style={styles.markBox}>
          <Animated.View style={{ transform: [{ scale: markScale }] }}>
            <StylaMark />
          </Animated.View>

          <Animated.View
            style={[
              styles.textBlock,
              { opacity: textFade, transform: [{ translateY: textShift }] },
            ]}
          >
            <Animated.Text style={[styles.word, { letterSpacing }]}>STYLA</Animated.Text>

            <Animated.View style={[styles.rule, { transform: [{ scaleX: ruleScale }] }]} />

            <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
              Kişisel stil asistanın
            </Animated.Text>
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markBox: { width: MARK_SIZE, height: MARK_SIZE },
  // Negatif yatay değerler: kelime işareti monogramdan geniş olabilir
  textBlock: {
    position: 'absolute',
    top: MARK_SIZE + spacing.xxl,
    left: -140,
    right: -140,
    alignItems: 'center',
    gap: spacing.md,
  },
  word: {
    ...typography.brand,
    color: colors.text,
    // Harf aralığı sağa boşluk ekler; optik ortalama için sola aynı miktar
    marginLeft: 6,
  },
  rule: {
    width: 56,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.accent,
  },
  tagline: {
    ...typography.caption,
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
});
