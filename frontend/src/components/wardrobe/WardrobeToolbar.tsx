import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import { Text } from '../ui/Text';

interface WardrobeToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  /** Kaç filtre aktif: düğmenin üstünde sayaç olarak görünür */
  activeFilterCount: number;
  onOpenFilters: () => void;
  /** Seçili sıralamanın kısa adı, düğmenin erişilebilirlik metninde kullanılır */
  sortLabel: string;
  onOpenSort: () => void;
}

/**
 * Arama + filtre + sıralama tek satırda.
 * Eskiden kart içine alınmış 52pt'lik form alanıydı; ızgaraya yer açmak için
 * ince bir pill'e indirildi.
 */
export const WardrobeToolbar: React.FC<WardrobeToolbarProps> = ({
  search,
  onSearchChange,
  activeFilterCount,
  onOpenFilters,
  sortLabel,
  onOpenSort,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.row}>
      <View style={[styles.searchPill, focused && styles.searchPillFocused]}>
        <Ionicons
          name="search"
          size={16}
          color={focused ? colors.text : colors.textTertiary}
        />
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Ara: gömlek, siyah, Zara…"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="Gardıropta ara"
        />
        {search.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aramayı temizle"
            hitSlop={10}
            onPress={() => onSearchChange('')}
          >
            <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <ToolbarButton
        icon="options-outline"
        label={activeFilterCount ? `Filtreler, ${activeFilterCount} aktif` : 'Filtreler'}
        onPress={onOpenFilters}
        active={activeFilterCount > 0}
        badge={activeFilterCount > 0 ? String(activeFilterCount) : undefined}
      />

      <ToolbarButton
        icon="swap-vertical-outline"
        label={`Sıralama: ${sortLabel}`}
        onPress={onOpenSort}
      />
    </View>
  );
};

const ToolbarButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  badge?: string;
}> = ({ icon, label, onPress, active = false, badge }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={() => {
      Haptics.selectionAsync().catch(() => undefined);
      onPress();
    }}
    style={({ pressed }) => [
      styles.button,
      active && styles.buttonActive,
      pressed && { opacity: 0.7 },
    ]}
  >
    <Ionicons name={icon} size={18} color={active ? colors.accentDark : colors.text} />
    {badge && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
  </Pressable>
);

const CONTROL_HEIGHT = 42;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: CONTROL_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.xs,
  },
  searchPillFocused: { borderColor: colors.borderStrong },
  input: {
    flex: 1,
    // TextInput'ta lineHeight dikey hizayı bozar (bkz. TextField)
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    fontWeight: typography.body.fontWeight,
    color: colors.text,
    paddingVertical: 0,
  },
  button: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  buttonActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDark,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    ...typography.captionStrong,
    fontSize: 10,
    lineHeight: 13,
    color: colors.textInverse,
  },
});
