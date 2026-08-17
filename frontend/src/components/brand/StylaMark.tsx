import React from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const MARK = require('../../../assets/logo-mark.png');

/**
 * Native açılış ekranındaki işaretin görünen halka çapı:
 * app.json → imageWidth (240pt) × splash-icon.png içindeki halka oranı (0.58).
 * logo-mark.png'de halka tuvalin %96'sı olduğu için 139 / 0.96 ≈ 145.
 * Bu sayı sayesinde native splash ile uygulama içi animasyon aynı boyutta durur.
 */
export const MARK_SIZE = 145;

interface StylaMarkProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** Styla monogramı (Didot "S" + ince terracotta halka) */
export const StylaMark: React.FC<StylaMarkProps> = ({ size = MARK_SIZE, style }) => (
  <Image
    source={MARK}
    style={[styles.mark, { width: size, height: size }, style]}
    resizeMode="contain"
    accessibilityIgnoresInvertColors
    accessible={false}
  />
);

const styles = StyleSheet.create({
  mark: { alignSelf: 'center' },
});
