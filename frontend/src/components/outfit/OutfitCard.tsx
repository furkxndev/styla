import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOccasionIcon, getOccasionLabel } from '../../constants/occasions';
import { colors, radius, spacing } from '../../theme';
import type { Outfit } from '../../types/outfit';
import { formatRelative } from '../../utils/date';
import { scoreLabel } from '../../utils/styleRules';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { WeatherPill } from '../weather/WeatherPill';
import { OutfitPreview } from './OutfitPreview';

interface OutfitCardProps {
  outfit: Outfit;
  onPress?: () => void;
  /** Geçmiş listesinde daha kompakt görünüm */
  compact?: boolean;
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
  outfit,
  onPress,
  compact = false,
}) => (
  <Card
    onPress={onPress}
    accessibilityLabel={`${getOccasionLabel(outfit.occasion)} kombini`}
    // Hava ve uyum bilgisi ayrılmış bir alt şeride taşındı: üstteki kimlik bilgisiyle karışmasın
    footer={
      <View style={styles.footer}>
        <WeatherPill weather={outfit.weather} compact />
        <Badge
          label={`${scoreLabel(outfit.score.overall)} · %${outfit.score.overall}`}
          tone={outfit.score.overall >= 75 ? 'success' : 'neutral'}
        />
      </View>
    }
  >
    <View style={styles.header}>
      <View style={styles.iconBox}>
        <Ionicons
          name={getOccasionIcon(outfit.occasion)}
          size={16}
          color={colors.textSecondary}
        />
      </View>
      <View style={styles.headerTexts}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {getOccasionLabel(outfit.occasion)}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          {formatRelative(outfit.wornAt ?? outfit.createdAt)}
        </Text>
      </View>
      <View style={styles.headerRight}>
        {outfit.wornAt && <Badge label="Giyildi" tone="success" icon="checkmark-circle" />}
        {outfit.feedback === 'liked' && (
          <Badge label="Beğenildi" tone="danger" icon="heart" />
        )}
      </View>
    </View>

    <OutfitPreview outfit={outfit} size={compact ? 'sm' : 'md'} showLabels={!compact} />

    {!compact && (
      <Text variant="callout" color={colors.textSecondary} numberOfLines={2}>
        {outfit.summary}
      </Text>
    )}
  </Card>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: spacing.xxs },
  headerRight: { flexDirection: 'row', gap: spacing.xs, flexShrink: 0 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
