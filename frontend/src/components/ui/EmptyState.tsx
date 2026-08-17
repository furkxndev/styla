import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'sparkles-outline',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
}) => (
  <View style={[styles.container, compact && styles.compact]}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={compact ? 22 : 28} color={colors.accent} />
    </View>
    <Text variant={compact ? 'title3' : 'title2'} align="center">
      {title}
    </Text>
    {description && (
      <Text
        variant="callout"
        color={colors.textSecondary}
        align="center"
        style={styles.description}
      >
        {description}
      </Text>
    )}
    {actionLabel && onAction && (
      <Button label={actionLabel} onPress={onAction} size={compact ? 'sm' : 'md'} />
    )}
    {secondaryActionLabel && onSecondaryAction && (
      <Button
        label={secondaryActionLabel}
        onPress={onSecondaryAction}
        variant="ghost"
        size="sm"
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  compact: { paddingVertical: spacing.xxl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  description: { maxWidth: 300 },
});
