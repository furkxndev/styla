import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../theme';
import { Text } from './Text';

export interface SegmentedOption<T> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Bugün / Bu ay" gibi birbirini dışlayan az sayıda seçim için.
 * Chip yığınına göre daha sakin: tek bir zemin, içinde kayan tek bir seçim.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
  style,
}: SegmentedControlProps<T>) {
  const height = size === 'sm' ? 32 : 40;

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { height, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
            disabled={disabled}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && { opacity: 0.6 },
            ]}
          >
            <Text
              style={[
                typography.captionStrong,
                {
                  fontSize: size === 'sm' ? 12 : 13,
                  color: selected ? colors.text : colors.textSecondary,
                  fontWeight: selected ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
  },
  // Seçili segment beyaz "kağıt" olarak öne çıkar; renkli dolgu göz yorardı
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: '#3A2E22',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
