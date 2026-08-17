import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, layout, radius, shadows, spacing } from '../../theme';
import type { WeatherSnapshot } from '../../types/weather';
import {
  formatTemperature,
  formatWind,
  getConditionIcon,
  getLayerHint,
  getWeatherGradient,
} from '../../utils/weather';
import { Skeleton } from '../ui/Skeleton';
import { Text } from '../ui/Text';

interface WeatherCardProps {
  weather: WeatherSnapshot | null;
  loading?: boolean;
  onPress?: () => void;
}

/** Gradyan üzerindeki metin renkleri: tek yerden yönetilsin diye sabitlendi */
const ON_GRADIENT = '#FFFFFF';
const ON_GRADIENT_SOFT = 'rgba(255,255,255,0.82)';

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, loading }) => {
  if (loading && !weather) {
    return (
      <View style={styles.skeleton}>
        <Skeleton width="45%" height={16} />
        <Skeleton width="35%" height={38} />
        <Skeleton width="70%" height={14} />
      </View>
    );
  }

  if (!weather) return null;

  const gradient = getWeatherGradient(weather.condition);

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={ON_GRADIENT_SOFT} />
          <Text
            variant="captionStrong"
            color={ON_GRADIENT_SOFT}
            numberOfLines={1}
            style={styles.cityName}
          >
            {weather.city}
          </Text>
        </View>
        <Ionicons
          name={getConditionIcon(weather.condition)}
          size={26}
          color={ON_GRADIENT}
        />
      </View>

      {/* Birincil bilgi: sıcaklık. Diğer her şey görsel olarak geriye alındı. */}
      <View style={styles.tempRow}>
        <Text variant="display" color={ON_GRADIENT}>
          {formatTemperature(weather.temperature)}
        </Text>
        <View style={styles.tempMeta}>
          <Text variant="bodyMedium" color={ON_GRADIENT} numberOfLines={1}>
            {weather.description}
          </Text>
          <Text variant="caption" color={ON_GRADIENT_SOFT} numberOfLines={1}>
            Hissedilen {formatTemperature(weather.feelsLike)} ·{' '}
            {formatTemperature(weather.minTemperature)}/
            {formatTemperature(weather.maxTemperature)}
          </Text>
        </View>
      </View>

      {/* İkincil bilgiler tek bir yarı saydam panelde toplandı: kart kalabalık görünmesin */}
      <View style={styles.panel}>
        <View style={styles.statsRow}>
          <Stat
            icon="water-outline"
            value={`%${weather.precipitationProbability}`}
            label="Yağış"
          />
          <Stat
            icon="speedometer-outline"
            value={formatWind(weather.windSpeed)}
            label="Rüzgâr"
          />
          <Stat icon="thermometer-outline" value={`%${weather.humidity}`} label="Nem" />
        </View>

        <View style={styles.panelDivider} />

        <View style={styles.hintRow}>
          <Ionicons name="sparkles" size={13} color={ON_GRADIENT_SOFT} />
          <Text variant="caption" color={ON_GRADIENT} style={styles.hintText}>
            {getLayerHint(weather.temperature)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const Stat: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}> = ({ icon, value, label }) => (
  <View style={styles.stat}>
    <Ionicons name={icon} size={14} color={ON_GRADIENT_SOFT} />
    <View style={styles.statTexts}>
      <Text variant="captionStrong" color={ON_GRADIENT} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color={ON_GRADIENT_SOFT} numberOfLines={1}>
        {label}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: spacing.lg,
    ...shadows.sm,
  },
  skeleton: {
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  // Uzun şehir adları ikonun yanından taşmasın
  cityName: { flexShrink: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tempRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  tempMeta: { flex: 1, paddingBottom: spacing.xs, gap: spacing.xxs },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  statTexts: { flex: 1 },
  panelDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hintText: { flex: 1 },
});
