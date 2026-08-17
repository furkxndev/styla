import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import type { ClothingItem } from '../../types/clothing';
import { itemSubtitle } from '../../utils/format';
import { Text } from '../ui/Text';
import { ClothingImage } from './ClothingImage';

interface ClothingCardProps {
  item: ClothingItem;
  onPress?: (item: ClothingItem) => void;
  /** Uzun basış: hızlı işlemler menüsü */
  onLongPress?: (item: ClothingItem) => void;
  onToggleFavorite?: (item: ClothingItem) => void;
  /** Seçim modunda (ör. kombine parça ekleme) */
  selected?: boolean;
  compact?: boolean;
}

/** Kıyafet fotoğrafları dikey çekiliyor: 4:5 kare orandan daha doğal duruyor */
const IMAGE_RATIO = 4 / 5;

export const ClothingCard: React.FC<ClothingCardProps> = ({
  item,
  onPress,
  onLongPress,
  onToggleFavorite,
  selected = false,
  compact = false,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${item.name}, ${itemSubtitle(item)}`}
    accessibilityState={{ selected }}
    onPress={() => onPress?.(item)}
    onLongPress={
      onLongPress &&
      (() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        onLongPress(item);
      })
    }
    delayLongPress={280}
    style={({ pressed }) => [
      styles.container,
      selected && styles.selected,
      pressed && styles.pressed,
    ]}
  >
    <View style={[styles.imageWrapper, compact && styles.imageWrapperCompact]}>
      <ClothingImage
        uri={item.thumbnailUrl || item.imageUrl}
        category={item.category}
        colorsList={item.colors}
        style={styles.imageFill}
        radiusSize={0}
        iconSize={compact ? 22 : 30}
      />

      {onToggleFavorite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          hitSlop={10}
          onPress={() => {
            Haptics.selectionAsync().catch(() => undefined);
            onToggleFavorite(item);
          }}
          style={({ pressed }) => [styles.favorite, pressed && { opacity: 0.75 }]}
        >
          <Ionicons
            name={item.isFavorite ? 'heart' : 'heart-outline'}
            size={15}
            color={item.isFavorite ? colors.danger : colors.textSecondary}
          />
        </Pressable>
      )}

      {/* Kaç kez giyildiği: gardıropta hangi parçanın döndüğünü gösterir */}
      {!compact && item.wearCount > 0 && (
        <View style={styles.wearBadge}>
          <Ionicons name="repeat" size={10} color={colors.textInverse} />
          <Text style={styles.wearText}>{item.wearCount}</Text>
        </View>
      )}

      {selected && (
        <View style={styles.checkOverlay}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primaryText} />
        </View>
      )}
    </View>

    <View style={styles.info}>
      <Text variant="bodyMedium" numberOfLines={1} style={styles.name}>
        {item.name}
      </Text>
      {!compact && (
        <View style={styles.metaRow}>
          <Text
            variant="caption"
            color={colors.textTertiary}
            numberOfLines={1}
            style={styles.subtitle}
          >
            {itemSubtitle(item)}
          </Text>
          <ColorDots colors={item.colors} />
        </View>
      )}
    </View>
  </Pressable>
);

/** Ürünün renkleri: metne ek olarak hızlı görsel eşleştirme sağlar */
const ColorDots: React.FC<{ colors: ClothingItem['colors'] }> = ({
  colors: itemColors,
}) => {
  if (!itemColors.length) return null;

  return (
    <View style={styles.dots}>
      {itemColors.slice(0, 3).map((color, index) => (
        <View
          key={`${color.hex}-${index}`}
          style={[
            styles.dot,
            { backgroundColor: color.hex },
            index > 0 && styles.dotOverlap,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.xs,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  imageWrapper: { width: '100%', aspectRatio: IMAGE_RATIO },
  imageWrapperCompact: { aspectRatio: 1 },
  // Genişlik + yükseklik birlikte verilince ClothingImage'ın kendi oranı devre dışı kalır
  imageFill: { width: '100%', height: '100%' },
  favorite: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  wearBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20,18,16,0.55)',
  },
  wearText: {
    ...typography.captionStrong,
    fontSize: 10,
    lineHeight: 13,
    color: colors.textInverse,
  },
  checkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,18,16,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xxs,
  },
  name: { fontSize: 13.5, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subtitle: { flex: 1, fontSize: 11 },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  dotOverlap: { marginLeft: -3 },
});
