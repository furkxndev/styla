import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import type { OutfitScore } from '../../types/outfit';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';

interface ScoreBreakdownProps {
  score: OutfitScore;
}

const ROWS: { key: keyof Omit<OutfitScore, 'overall'>; label: string }[] = [
  { key: 'colorHarmony', label: 'Renk uyumu' },
  { key: 'styleCoherence', label: 'Stil bütünlüğü' },
  { key: 'weatherFit', label: 'Havaya uygunluk' },
  { key: 'personalPreference', label: 'Senin tarzın' },
];

/** AI'ın kombini neden seçtiğini şeffaf gösteren skor dökümü */
export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ score }) => (
  <View style={styles.container}>
    {ROWS.map((row) => (
      <View key={row.key} style={styles.row}>
        <View style={styles.labelRow}>
          <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {row.label}
          </Text>
          <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
            %{Math.round(score[row.key])}
          </Text>
        </View>
        <ProgressBar
          value={score[row.key]}
          color={score[row.key] >= 75 ? colors.success : colors.accent}
          height={5}
        />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  row: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
