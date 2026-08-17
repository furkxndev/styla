import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import { Badge } from './Badge';
import { Text } from './Text';

interface ListRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightSlot?: React.ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  /** Başlığın yanında küçük durum etiketi (ör. "Yeni", "3") */
  badge?: string;
  /** destructive ile aynı sonucu verir; anlamsal olarak daha genel */
  tone?: 'default' | 'danger';
}

/** Ayarlar / profil listelerinde kullanılan satır */
export const ListRow: React.FC<ListRowProps> = ({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  rightSlot,
  showChevron = true,
  destructive = false,
  badge,
  tone = 'default',
}) => {
  // Eski `destructive` prop'u korunuyor; ikisinden biri yeterli
  const isDanger = destructive || tone === 'danger';

  const content = (
    <View style={styles.row}>
      {icon && (
        <View
          style={[
            styles.iconBox,
            { backgroundColor: isDanger ? colors.dangerSoft : colors.surfaceAlt },
          ]}
        >
          <Ionicons
            name={icon}
            size={17}
            color={iconColor ?? (isDanger ? colors.danger : colors.text)}
          />
        </View>
      )}

      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text
            variant="bodyMedium"
            color={isDanger ? colors.danger : colors.text}
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </Text>
          {badge && <Badge label={badge} tone={isDanger ? 'danger' : 'neutral'} />}
        </View>
        {subtitle && (
          <Text variant="caption" color={colors.textTertiary} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {value && (
        // Sağdaki değer satırın yarısından fazlasını kaplayamaz; uzun değerler
        // (ör. "anthropic/claude-sonnet-4.5") başlığı ezmek yerine kısaltılır.
        <Text
          variant="callout"
          color={colors.textSecondary}
          numberOfLines={1}
          style={styles.value}
        >
          {value}
        </Text>
      )}
      {rightSlot}
      {onPress && showChevron && !rightSlot && (
        <Ionicons name="chevron-forward" size={17} color={colors.textQuaternary} />
      )}
    </View>
  );

  if (!onPress) return <View style={styles.container}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: colors.surfaceSubtle },
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1 },
  value: { flexShrink: 0, maxWidth: '45%', textAlign: 'right' },
});
