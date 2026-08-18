import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../../theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Sol tarafta renk noktası (renk filtreleri için) */
  dotColor?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  dotColor,
  size = 'md',
  disabled = false,
  style,
}) => {
  const height = size === 'sm' ? 30 : 38;
  // Seçili durum vurgu zemini + vurgu kenarlığı ile anlatılır; metin kontrast
  // için koyu kalır (koyu dolgu, sıcak paletin içinde sert bir blok oluyordu).
  const fg = selected ? colors.text : colors.textSecondary;

  const content = (
    <View style={styles.row}>
      {dotColor && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              borderColor: selected ? colors.borderStrong : colors.border,
            },
          ]}
        />
      )}
      {icon && <Ionicons name={icon} size={size === 'sm' ? 13 : 15} color={fg} />}
      <Text
        style={[
          typography.caption,
          {
            color: fg,
            fontSize: size === 'sm' ? 12 : 13,
            fontWeight: selected ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          {
            height,
            backgroundColor: selected ? colors.accentSoft : colors.surface,
            borderColor: selected ? colors.accent : colors.border,
          },
          style,
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
});
