import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import type { Outfit, OutfitSlot } from '../../types/outfit';
import { Text } from '../ui/Text';
import { ClothingImage } from '../wardrobe/ClothingImage';

interface OutfitPreviewProps {
  outfit: Outfit;
  onItemPress?: (slot: OutfitSlot) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const ROLE_ORDER: OutfitSlot['role'][] = [
  'outerwear',
  'top',
  'dress',
  'bottom',
  'shoes',
  'bag',
  'accessory',
];

const ROLE_LABELS: Record<OutfitSlot['role'], string> = {
  outerwear: 'Dış',
  top: 'Üst',
  dress: 'Elbise',
  bottom: 'Alt',
  shoes: 'Ayakkabı',
  bag: 'Çanta',
  accessory: 'Aksesuar',
};

const SIZES = { sm: 56, md: 76, lg: 96 };

/** Kombindeki parçaları yatay bir şerit hâlinde gösterir */
export const OutfitPreview: React.FC<OutfitPreviewProps> = ({
  outfit,
  onItemPress,
  size = 'md',
  showLabels = true,
}) => {
  const dimension = SIZES[size];
  const slots = [...outfit.slots].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  return (
    <View style={styles.container}>
      {slots.map((slot) => (
        <Pressable
          key={slot.itemId}
          accessibilityRole={onItemPress ? 'button' : 'image'}
          accessibilityLabel={`${ROLE_LABELS[slot.role]}: ${slot.item.name}`}
          onPress={() => onItemPress?.(slot)}
          style={({ pressed }) => [styles.slot, pressed && onItemPress && { opacity: 0.8 }]}
        >
          <ClothingImage
            uri={slot.item.thumbnailUrl || slot.item.imageUrl}
            category={slot.item.category}
            colorsList={slot.item.colors}
            style={{ width: dimension, height: dimension }}
            radiusSize={radius.md}
            iconSize={dimension * 0.32}
          />
          {showLabels && (
            <Text
              variant="caption"
              color={colors.textTertiary}
              numberOfLines={1}
              style={[styles.label, { width: dimension }]}
            >
              {ROLE_LABELS[slot.role]}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: { gap: spacing.xs },
  label: { textAlign: 'center', fontSize: 10 },
});
