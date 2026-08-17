import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export type StatTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface StatTrend {
  value: string;
  direction: 'up' | 'down' | 'flat';
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: StatTone;
  trend?: StatTrend;
  /**
   * Dar kolonlarda (3'lü ızgara) kullanılır: ikon üstte, değer ortada,
   * etiket altta ve iki satıra sığabilir. Yan yana dizilişte "Kayıtlı gün"
   * gibi etiketler tek satıra sığmıyordu.
   */
  compact?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Ton -> ikon rozeti ve değer rengi. Zemin hep beyaz kalır ki metrik ızgarası sakin dursun. */
const TONES: Record<StatTone, { badgeBg: string; badgeFg: string; value: string }> = {
  neutral: {
    badgeBg: colors.surfaceAlt,
    badgeFg: colors.textSecondary,
    value: colors.text,
  },
  accent: { badgeBg: colors.accentSoft, badgeFg: colors.accentDark, value: colors.text },
  success: { badgeBg: colors.successSoft, badgeFg: colors.success, value: colors.success },
  warning: { badgeBg: colors.warningSoft, badgeFg: colors.warning, value: colors.text },
  danger: { badgeBg: colors.dangerSoft, badgeFg: colors.danger, value: colors.danger },
};

const TREND_ICON: Record<StatTrend['direction'], keyof typeof Ionicons.glyphMap> = {
  up: 'trending-up',
  down: 'trending-down',
  flat: 'remove',
};

const TREND_COLOR: Record<StatTrend['direction'], string> = {
  up: colors.success,
  down: colors.danger,
  flat: colors.textTertiary,
};

/**
 * Tek bir metriği gösteren kart: büyük değer, küçük etiket, opsiyonel rozet.
 * Admin panelindeki "bugünkü harcama" gibi sayısal özetler için.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  trend,
  compact = false,
  loading = false,
  onPress,
  style,
}) => {
  const toneStyle = TONES[tone];

  if (compact) {
    return (
      <Card
        onPress={onPress}
        accessibilityLabel={`${label}: ${value}`}
        style={style}
        padded={false}
      >
        <View style={styles.compactBody}>
          {icon && (
            <View style={[styles.compactBadge, { backgroundColor: toneStyle.badgeBg }]}>
              <Ionicons name={icon} size={14} color={toneStyle.badgeFg} />
            </View>
          )}

          {loading ? (
            <Skeleton width="50%" height={24} />
          ) : (
            <Text
              style={[typography.metric, { color: toneStyle.value }, styles.compactValue]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {value}
            </Text>
          )}

          <Text
            variant="caption"
            color={colors.textSecondary}
            align="center"
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={onPress} accessibilityLabel={`${label}: ${value}`} style={style}>
      <View style={styles.topRow}>
        <Text
          variant="captionStrong"
          color={colors.textSecondary}
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </Text>
        {icon && (
          <View style={[styles.badge, { backgroundColor: toneStyle.badgeBg }]}>
            <Ionicons name={icon} size={15} color={toneStyle.badgeFg} />
          </View>
        )}
      </View>

      {loading ? (
        <Skeleton width="60%" height={30} style={styles.valueSkeleton} />
      ) : (
        <Text
          style={[typography.metric, { color: toneStyle.value }, styles.value]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
      )}

      {(hint || trend) && !loading && (
        <View style={styles.bottomRow}>
          {trend && (
            <View style={styles.trend}>
              <Ionicons
                name={TREND_ICON[trend.direction]}
                size={13}
                color={TREND_COLOR[trend.direction]}
              />
              <Text variant="captionStrong" color={TREND_COLOR[trend.direction]}>
                {trend.value}
              </Text>
            </View>
          )}
          {hint && (
            <Text
              variant="caption"
              color={colors.textTertiary}
              numberOfLines={1}
              style={styles.hint}
            >
              {hint}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  compactBody: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  compactBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactValue: { fontSize: 26, lineHeight: 32 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: { flex: 1 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { marginTop: spacing.sm },
  valueSkeleton: { marginTop: spacing.sm },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  trend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexShrink: 0 },
  hint: { flex: 1 },
});
