import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radius, shadows, spacing } from '../../theme';
import { Text } from './Text';

type CardVariant = 'default' | 'subtle' | 'outline';

interface CardHeader {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void };
}

interface CardProps {
  children?: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  background?: string;
  /**
   * Görsel ağırlık: default (beyaz + hafif gölge), subtle (kart içi / ikincil,
   * gölgesiz), outline (yalnız kenarlık). Verilmezse mevcut görünüm korunur.
   */
  variant?: CardVariant;
  /** Tekrar eden "başlık + kart" kalıbı: ekranlarda ayrı SectionHeader gerekmez */
  header?: CardHeader;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Her varyantın varsayılanları; açıkça verilen prop her zaman kazanır */
const VARIANTS: Record<
  CardVariant,
  {
    background: string;
    borderColor: string;
    bordered: boolean;
    elevation: CardProps['elevation'];
  }
> = {
  default: {
    background: colors.surface,
    borderColor: colors.border,
    bordered: true,
    elevation: 'sm',
  },
  subtle: {
    background: colors.surfaceSubtle,
    borderColor: colors.borderSubtle,
    bordered: true,
    elevation: 'none',
  },
  outline: {
    background: 'transparent',
    borderColor: colors.border,
    bordered: true,
    elevation: 'none',
  },
};

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  padded = true,
  elevation,
  bordered,
  background,
  variant = 'default',
  header,
  footer,
  style,
  accessibilityLabel,
}) => {
  const preset = VARIANTS[variant];
  const resolvedElevation = elevation ?? preset.elevation ?? 'none';
  const resolvedBordered = bordered ?? preset.bordered;
  const resolvedBackground = background ?? preset.background;

  const containerStyle = [
    styles.base,
    shadows[resolvedElevation],
    {
      backgroundColor: resolvedBackground,
      borderColor: preset.borderColor,
      borderWidth: resolvedBordered ? 1 : 0,
      padding: padded ? layout.cardPadding : 0,
    },
    style,
  ];

  // Başlık/footer yokken eski davranış birebir korunur (sadece children)
  const inner =
    header || footer ? (
      <View style={styles.stack}>
        {header && <CardHeaderRow {...header} padded={padded} />}
        {children}
        {footer && (
          <View style={[styles.footer, !padded && styles.footerFlush]}>{footer}</View>
        )}
      </View>
    ) : (
      children
    );

  if (!onPress) return <View style={containerStyle}>{inner}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? header?.title}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
};

const CardHeaderRow: React.FC<CardHeader & { padded: boolean }> = ({
  title,
  subtitle,
  icon,
  action,
  padded,
}) => (
  <View style={[styles.header, !padded && styles.headerFlush]}>
    {icon && (
      <View style={styles.headerIcon}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
      </View>
    )}
    <View style={styles.headerTexts}>
      <Text variant="title3" numberOfLines={1}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="caption" color={colors.textTertiary} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
    </View>
    {action && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={action.onPress}
        hitSlop={layout.hitSlop}
        style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.6 }]}
      >
        <Text variant="captionStrong" color={colors.accentDark} numberOfLines={1}>
          {action.label}
        </Text>
        <Ionicons name="chevron-forward" size={13} color={colors.accentDark} />
      </Pressable>
    )}
  </View>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  stack: { gap: layout.cardGap },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // padded=false iken başlık kenara yapışmasın
  headerFlush: { paddingHorizontal: layout.cardPadding, paddingTop: layout.cardPadding },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: spacing.xxs },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 0,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  footerFlush: { paddingHorizontal: layout.cardPadding, paddingBottom: layout.cardPadding },
});
