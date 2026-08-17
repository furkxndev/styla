import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  rightSlot?: React.ReactNode;
}

/** Modal ve detay ekranlarında kullanılan sade başlık */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightAccessibilityLabel = 'Menü',
  rightSlot,
}) => (
  <View style={styles.container}>
    <View style={styles.side}>
      {onBack && (
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Geri"
          onPress={onBack}
          background={colors.surface}
          bordered
        />
      )}
    </View>

    <View style={styles.center}>
      {title && (
        <Text variant="title3" align="center" numberOfLines={1}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text
          variant="caption"
          color={colors.textTertiary}
          align="center"
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      )}
    </View>

    <View style={[styles.side, styles.right]}>
      {rightSlot}
      {!rightSlot && rightIcon && (
        <IconButton
          icon={rightIcon}
          accessibilityLabel={rightAccessibilityLabel}
          onPress={onRightPress}
          background={colors.surface}
          bordered
        />
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  side: { width: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, gap: spacing.xxs },
});
