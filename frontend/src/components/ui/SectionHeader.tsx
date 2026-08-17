import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../theme';
import { Text } from './Text';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    <View style={styles.titles}>
      <Text variant="title3">{title}</Text>
      {subtitle && (
        <Text variant="caption" color={colors.textTertiary}>
          {subtitle}
        </Text>
      )}
    </View>
    {actionLabel && onAction && (
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        hitSlop={layout.hitSlop}
        style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
      >
        <Text variant="captionStrong" color={colors.accentDark}>
          {actionLabel}
        </Text>
        <Ionicons name="chevron-forward" size={13} color={colors.accentDark} />
      </Pressable>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  titles: { flex: 1, gap: spacing.xxs },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
