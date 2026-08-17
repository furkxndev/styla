import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';
import { clamp } from '../../utils/format';

interface ProgressBarProps {
  /** 0-100 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = colors.primary,
  trackColor = colors.surfaceAlt,
  height = 6,
  style,
}) => (
  <View
    accessibilityRole="progressbar"
    accessibilityValue={{ now: Math.round(value), min: 0, max: 100 }}
    style={[styles.track, { backgroundColor: trackColor, height }, style]}
  >
    <View
      style={{
        width: `${clamp(value, 0, 100)}%`,
        height: '100%',
        backgroundColor: color,
        borderRadius: radius.pill,
      }}
    />
  </View>
);

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
