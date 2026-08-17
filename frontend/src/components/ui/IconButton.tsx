import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, layout, radius } from '../../theme';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  background?: string;
  bordered?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 20,
  color = colors.text,
  background = 'transparent',
  bordered = false,
  disabled = false,
  accessibilityLabel,
  style,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    hitSlop={layout.hitSlop}
    disabled={disabled}
    onPress={() => {
      if (disabled) return;
      Haptics.selectionAsync().catch(() => undefined);
      onPress?.();
    }}
    style={({ pressed }) => [
      styles.base,
      {
        width: size + 20,
        height: size + 20,
        backgroundColor: background,
        borderWidth: bordered ? 1 : 0,
        borderColor: colors.border,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      },
      style,
    ]}
  >
    <Ionicons name={icon} size={size} color={color} />
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
