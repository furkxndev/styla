import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, palette, radius, shadows, spacing, typography } from '../../theme';
import { Text } from '../ui/Text';

const MAX_LENGTH = 500;
/** Sayaç yalnızca sınıra yaklaşırken görünür, sürekli değil */
const COUNTER_THRESHOLD = MAX_LENGTH - 80;

interface ChatComposerProps {
  onSend: (message: string) => void;
  /** Cevap beklenirken gönderme kapatılır, düğme yükleniyor durumuna geçer */
  sending?: boolean;
  placeholder?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  sending = false,
  placeholder = 'Bir şey sor…',
}) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !sending;

  const press = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  const handleSend = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onSend(trimmed);
    setValue('');
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, shadows.sm, focused && styles.containerFocused]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={sending ? 'Asistan yanıtlıyor…' : placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_LENGTH}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          blurOnSubmit={false}
          // Cevap beklenirken yazmaya devam edilebilir; yalnızca gönderme kapanır
          // (editable=false klavyeyi kapatıp akışı bozuyor)
          accessibilityLabel="Mesaj yaz"
        />

        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            accessibilityState={{ disabled: !canSend }}
            onPress={handleSend}
            onPressIn={() => canSend && press(0.9)}
            onPressOut={() => press(1)}
            disabled={!canSend}
            hitSlop={8}
          >
            {sending ? (
              <View style={[styles.send, styles.sendIdle]}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            ) : canSend ? (
              <LinearGradient
                colors={[palette.ink700, palette.ink900]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.send}
              >
                <Ionicons name="arrow-up" size={19} color={colors.primaryText} />
              </LinearGradient>
            ) : (
              <View style={[styles.send, styles.sendIdle]}>
                <Ionicons name="arrow-up" size={19} color={colors.textQuaternary} />
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>

      {value.length >= COUNTER_THRESHOLD && (
        <Text
          variant="caption"
          color={value.length >= MAX_LENGTH ? colors.danger : colors.textTertiary}
          style={styles.counter}
        >
          {value.length}/{MAX_LENGTH}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
  },
  containerFocused: { borderColor: colors.borderStrong },
  input: {
    flex: 1,
    // TextInput'ta lineHeight dikey hizayı bozar (bkz. TextField)
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.text,
    maxHeight: 116,
    paddingTop: spacing.sm + 1,
    paddingBottom: spacing.sm + 1,
  },
  send: {
    // 44pt dokunma hedefi: 36 + hitSlop 8
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIdle: { backgroundColor: colors.surfaceAlt },
  counter: { alignSelf: 'flex-end', paddingRight: spacing.sm, fontSize: 11 },
});
