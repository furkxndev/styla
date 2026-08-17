import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { Text } from './Text';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'dark';

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
  accent: { bg: colors.accentSoft, fg: colors.accentDark },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  dark: { bg: colors.primary, fg: colors.primaryText },
};

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral', icon, style }) => {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text
        style={[typography.captionStrong, { color: fg, fontSize: 11 }, styles.label]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Rozet bir satır içinde yer aldığında komşularını ezmesin diye küçülebilir
  label: { flexShrink: 1 },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
