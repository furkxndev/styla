import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { AssistantAvatar } from './AssistantAvatar';

/**
 * Bekleme ekranı boş kalmasın: nokta animasyonunun yanında
 * asistanın o an ne yaptığını anlatan metin dönüşümlü değişir.
 */
const STEPS = [
  'Gardırobuna bakıyor…',
  'Hava durumunu değerlendiriyor…',
  'Kombini kuruyor…',
];

const STEP_DURATION = 2600;

export const TypingIndicator: React.FC = () => {
  const [step, setStep] = useState(0);
  const labelOpacity = useRef(new Animated.Value(1)).current;
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(dot, {
            toValue: 1,
            duration: 340,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 340,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 140),
        ]),
      ),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(labelOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(() => {
        setStep((current) => (current + 1) % STEPS.length);
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, [labelOpacity]);

  return (
    <View style={styles.wrapper} accessibilityLabel="Asistan yazıyor">
      <AssistantAvatar size={28} />

      <View style={[styles.bubble, shadows.xs]}>
        <View style={styles.dots}>
          {dots.map((dot, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.28, 1],
                  }),
                  transform: [
                    {
                      translateY: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -3],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.separator} />

        <Animated.View style={{ opacity: labelOpacity }}>
          <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
            {STEPS[step]}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: colors.border,
  },
});
