import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout } from '../../theme';

interface DividerProps {
  /** Kart içi listelerde çizgi kenara değmesin diye soldan içeri alır */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Saç teli kalınlığında ayraç: bölümleri ayırır ama dikkat çekmez */
export const Divider: React.FC<DividerProps> = ({ inset = false, style }) => (
  <View style={[styles.line, inset && styles.inset, style]} />
);

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
  },
  inset: { marginLeft: layout.cardPadding },
});
