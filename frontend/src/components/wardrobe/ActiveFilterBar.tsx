import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radius, spacing } from '../../theme';
import { Text } from '../ui/Text';

export interface ActiveFilter {
  key: string;
  label: string;
  /** Renk filtresinde çipin solunda renk noktası */
  dotColor?: string;
  onRemove: () => void;
}

interface ActiveFilterBarProps {
  filters: ActiveFilter[];
  onClearAll: () => void;
}

/**
 * Aktif filtreler tek tek görünür ve tek dokunuşla kaldırılır.
 * "3 filtre aktif" gibi toplu bir etiket hangi filtrenin açık olduğunu
 * gizliyordu.
 */
export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({
  filters,
  onClearAll,
}) => {
  if (!filters.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {filters.map((filter) => (
        <Pressable
          key={filter.key}
          accessibilityRole="button"
          accessibilityLabel={`${filter.label} filtresini kaldır`}
          onPress={filter.onRemove}
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
        >
          {filter.dotColor && (
            <View style={[styles.dot, { backgroundColor: filter.dotColor }]} />
          )}
          <Text variant="captionStrong" color={colors.accentDark} numberOfLines={1}>
            {filter.label}
          </Text>
          <Ionicons name="close" size={13} color={colors.accentDark} />
        </Pressable>
      ))}

      {filters.length > 1 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tüm filtreleri temizle"
          onPress={onClearAll}
          style={({ pressed }) => [styles.clear, pressed && { opacity: 0.7 }]}
        >
          <Text variant="captionStrong" color={colors.textSecondary}>
            Temizle
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoft,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  clear: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
