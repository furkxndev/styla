import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  /** Verilirse yükseklik genişliğe göre hesaplanır (görsel yer tutucuları için) */
  aspectRatio?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  aspectRatio,
  borderRadius = radius.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, borderRadius, backgroundColor: colors.skeleton, opacity },
        aspectRatio ? { aspectRatio } : { height },
        style,
      ]}
    />
  );
};

/** Ana sayfadaki kombin kartı için hazır iskelet */
export const OutfitCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.row}>
      <Skeleton width={72} height={72} borderRadius={radius.md} />
      <View style={styles.column}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={14} />
      </View>
    </View>
    <Skeleton height={12} />
    <Skeleton width="80%" height={12} />
    <View style={styles.row}>
      <Skeleton width={90} height={34} borderRadius={radius.pill} />
      <Skeleton width={90} height={34} borderRadius={radius.pill} />
    </View>
  </View>
);

/** Gardırop ızgarası için ilk yükleme iskeleti (ClothingCard ile aynı oran) */
export const ClothingCardSkeleton: React.FC = () => (
  <View style={styles.gridCard}>
    <Skeleton aspectRatio={4 / 5} borderRadius={0} />
    <View style={styles.gridInfo}>
      <Skeleton width="80%" height={12} />
      <Skeleton width="55%" height={10} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  gridInfo: { padding: spacing.md, gap: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  column: { flex: 1, gap: spacing.sm },
});
