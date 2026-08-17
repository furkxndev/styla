import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CATEGORIES } from '../../constants/categories';
import { colors, layout, radius, spacing, typography } from '../../theme';
import type { ClothingCategory } from '../../types/clothing';
import { Text } from '../ui/Text';

interface CategoryFilterBarProps {
  value: ClothingCategory | 'all';
  onChange: (value: ClothingCategory | 'all') => void;
  /** Kategori başına ürün sayısı */
  counts?: Record<string, number>;
  /** "Tümü" çipinde gösterilecek toplam */
  total?: number;
}

/**
 * Gardırobun ana gezinme şeridi. Sayı, etiketin içine karışmak yerine
 * ayrı bir baloncukta durur — hangi kategoride ne kadar parça olduğu
 * tek bakışta okunur.
 */
export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  value,
  onChange,
  counts,
  total,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.content}
  >
    <CategoryChip
      label="Tümü"
      count={total}
      selected={value === 'all'}
      onPress={() => onChange('all')}
    />

    {CATEGORIES.map((category) => {
      const count = counts?.[category.key];
      // Boş kategoriler şeridi şişirmesin
      if (counts && !count) return null;
      return (
        <CategoryChip
          key={category.key}
          label={category.label}
          icon={category.icon}
          count={count}
          selected={value === category.key}
          onPress={() => onChange(category.key)}
        />
      );
    })}
  </ScrollView>
);

const CategoryChip: React.FC<{
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
  selected: boolean;
  onPress: () => void;
}> = ({ label, icon, count, selected, onPress }) => {
  const fg = selected ? colors.primaryText : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count != null ? `${label}, ${count} parça` : label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={fg} />}
      <Text
        style={[styles.label, { color: fg, fontWeight: selected ? '700' : '500' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count != null && (
        <View style={[styles.count, selected && styles.countSelected]}>
          <Text style={[styles.countText, { color: fg }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 34,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { ...typography.caption, fontSize: 13 },
  count: {
    minWidth: 20,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  // Seçili çipte sayı baloncuğu koyu zeminde okunur kalsın
  countSelected: { backgroundColor: 'rgba(255,255,255,0.18)' },
  countText: { ...typography.captionStrong, fontSize: 11 },
});
