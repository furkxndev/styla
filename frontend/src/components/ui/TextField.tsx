import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { Text } from './Text';
import { IconButton } from './IconButton';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
  multiline?: boolean;
}

/**
 * forwardRef: formlarda "sonraki alana geç" akışı için gerekli.
 * Ref doğrudan içteki TextInput'a bağlanır (ref.current.focus()).
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, icon, containerStyle, secureTextEntry, multiline, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="captionStrong" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          multiline && styles.multilineWrapper,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.text : colors.textTertiary}
            style={styles.icon}
          />
        )}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.multilineInput]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={hidden}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry && (
          <IconButton
            icon={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={colors.textTertiary}
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            onPress={() => setHidden((prev) => !prev)}
          />
        )}
      </View>

      {(error || hint) && (
        <Text
          variant="caption"
          color={error ? colors.danger : colors.textTertiary}
          style={styles.helper}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    minHeight: 96,
  },
  focused: { borderColor: colors.primary },
  errored: { borderColor: colors.danger },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    // DİKKAT: TextInput'a lineHeight VERİLMEZ. iOS'ta metni dikeyde aşağı
    // kaydırıp alan içinde ortalanmamış gösteriyor. Bu yüzden typography.body
    // yayılmıyor; yalnızca yazı tipi özellikleri tek tek alınıyor.
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  helper: { marginLeft: spacing.xs },
});
