import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette, radius, shadows } from '../../theme';

interface AssistantAvatarProps {
  size?: number;
  /** Sağ alt köşede canlılık noktası: asistanın hazır olduğunu söyler */
  online?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Asistanın tek görsel imzası. Vurgu renginde gradyan + sparkles ikonu;
 * başlıkta, baloncuklarda ve karşılama ekranında aynı işaret kullanılır.
 */
export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({
  size = 36,
  online = false,
  style,
}) => {
  const dotSize = Math.max(8, Math.round(size * 0.26));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={[palette.accent500, palette.accent600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, { borderRadius: radius.pill }, size >= 32 && shadows.xs]}
      >
        <Ionicons
          name="sparkles"
          size={Math.round(size * 0.46)}
          color={colors.textInverse}
        />
      </LinearGradient>

      {online && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              borderWidth: Math.max(1.5, dotSize * 0.18),
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    backgroundColor: colors.success,
    borderColor: colors.background,
  },
});
