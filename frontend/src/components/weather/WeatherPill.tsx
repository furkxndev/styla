import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme';
import type { WeatherSnapshot } from '../../types/weather';
import { formatTemperature, getConditionIcon } from '../../utils/weather';
import { Text } from '../ui/Text';

interface WeatherPillProps {
  weather?: WeatherSnapshot | null;
  compact?: boolean;
}

/** Kombin kartlarında/geçmişte gösterilen küçük hava durumu rozeti */
export const WeatherPill: React.FC<WeatherPillProps> = ({ weather, compact = false }) => {
  if (!weather) return null;

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Ionicons
        name={getConditionIcon(weather.condition)}
        size={compact ? 12 : 14}
        color={colors.textSecondary}
      />
      <Text
        variant="caption"
        color={colors.textSecondary}
        style={compact && styles.compactText}
      >
        {formatTemperature(weather.temperature)}
        {!compact && ` · ${weather.description}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    alignSelf: 'flex-start',
  },
  compact: { paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm },
  compactText: { fontSize: 11 },
});
