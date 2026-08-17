import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCategoryIcon } from '../../constants/categories';
import { colors, radius } from '../../theme';
import type { ClothingCategory, ClothingColor } from '../../types/clothing';
import { getReadableTextColor, withAlpha } from '../../utils/color';

interface ClothingImageProps {
  uri?: string;
  category: ClothingCategory;
  colorsList?: ClothingColor[];
  style?: StyleProp<ViewStyle>;
  radiusSize?: number;
  iconSize?: number;
}

/**
 * Ürün görseli. Görsel yoksa veya yüklenemezse ürünün rengine göre
 * zarif bir yer tutucu gösterir (uygulama internetsiz de düzgün görünür).
 */
export const ClothingImage: React.FC<ClothingImageProps> = ({
  uri,
  category,
  colorsList = [],
  style,
  radiusSize = radius.md,
  iconSize = 26,
}) => {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;

  const base = colorsList[0]?.hex ?? colors.surfaceAlt;
  const second = colorsList[1]?.hex ?? withAlpha(base, 0.55);
  const iconColor = getReadableTextColor(base, colors.textSecondary, '#FFFFFF');

  if (showImage) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { borderRadius: radiusSize }, style] as StyleProp<ImageStyle>}
        contentFit="cover"
        transition={180}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.image, { borderRadius: radiusSize, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[base, second]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        <View style={styles.center}>
          <Ionicons name={getCategoryIcon(category)} size={iconSize} color={iconColor} />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceAlt,
  },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
