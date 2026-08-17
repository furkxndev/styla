import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import type { ClothingItem } from '../../types/clothing';
import { Text } from '../ui/Text';
import { ClothingImage } from '../wardrobe/ClothingImage';

interface ReferencedItemsProps {
  items: ClothingItem[];
  onItemPress?: (item: ClothingItem) => void;
}

/**
 * AI'ın cevabında adı geçen gardırop parçaları.
 * Baloncuğun dışında durur: metin blokunu bozmadan dokunulabilir kalır.
 */
export const ReferencedItems: React.FC<ReferencedItemsProps> = ({ items, onItemPress }) => (
  <View style={styles.wrapper}>
    <Text variant="overline" color={colors.textQuaternary}>
      Bahsedilen parçalar
    </Text>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.name}
          onPress={() => onItemPress?.(item)}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        >
          <View style={styles.imageFrame}>
            <ClothingImage
              uri={item.thumbnailUrl || item.imageUrl}
              category={item.category}
              colorsList={item.colors}
              style={styles.image}
              radiusSize={radius.sm}
              iconSize={18}
            />
          </View>
          <Text
            variant="caption"
            color={colors.textSecondary}
            numberOfLines={1}
            style={styles.name}
          >
            {item.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  // stretch: yatay şerit baloncuk genişliğini alsın, içerik kadar daralmasın
  wrapper: { alignSelf: 'stretch', gap: spacing.sm, paddingTop: spacing.xs },
  strip: { gap: spacing.sm, paddingRight: spacing.sm },
  item: { width: 72, gap: spacing.xs },
  itemPressed: { opacity: 0.75 },
  // Çerçeve: açık renkli kıyafet görselleri beyaz zeminde kaybolmasın
  imageFrame: {
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
    backgroundColor: colors.surface,
  },
  image: { width: '100%', height: 66 },
  name: { fontSize: 11, textAlign: 'center' },
});
