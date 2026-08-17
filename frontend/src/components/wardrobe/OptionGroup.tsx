import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { Chip } from '../ui/Chip';
import { Text } from '../ui/Text';

export interface Option<T extends string | number> {
  value: T;
  label: string;
  dotColor?: string;
}

interface OptionGroupProps<T extends string | number> {
  label?: string;
  hint?: string;
  options: Option<T>[];
  /** Tekli seçim */
  value?: T;
  /** Çoklu seçim */
  values?: T[];
  onSelect?: (value: T) => void;
  onToggle?: (value: T) => void;
  size?: 'sm' | 'md';
}

/** Ürün düzenleme ekranındaki etiket seçicileri (tek veya çok seçimli) */
export function OptionGroup<T extends string | number>({
  label,
  hint,
  options,
  value,
  values,
  onSelect,
  onToggle,
  size = 'sm',
}: OptionGroupProps<T>) {
  return (
    <View style={styles.container}>
      {label && (
        // Etiket ve ipucu alt alta: yan yana dizilince uzun ipuçları
        // ("Bu renkleri kombinlerde kullanmayacağım") etikete çarpıyordu.
        <View style={styles.labelBlock}>
          <Text variant="captionStrong" color={colors.textSecondary}>
            {label}
          </Text>
          {hint && (
            <Text variant="caption" color={colors.textTertiary}>
              {hint}
            </Text>
          )}
        </View>
      )}
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = values ? values.includes(option.value) : value === option.value;
          return (
            <Chip
              key={String(option.value)}
              label={option.label}
              dotColor={option.dotColor}
              selected={selected}
              size={size}
              onPress={() => {
                if (values && onToggle) onToggle(option.value);
                else onSelect?.(option.value);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  labelBlock: {
    gap: spacing.xxs,
    marginLeft: spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
