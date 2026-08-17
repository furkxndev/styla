import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Header, Screen, Text, TextField } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { validateEmail, validatePassword } from '../../utils/validation';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const login = useAuthStore((state) => state.login);
  const status = useAuthStore((state) => state.status);
  const serverError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>(
    {},
  );
  // "Sonraki" tuşuyla alanlar arası geçiş: her alana tek tek dokunmak gerekmesin
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    clearError();
    await login({ email: email.trim(), password });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.titles}>
            <Text variant="title1">Tekrar hoş geldin</Text>
            <Text variant="body" color={colors.textSecondary}>
              Gardırobun ve kombin geçmişin seni bekliyor.
            </Text>
          </View>

          <Card>
            <View style={styles.form}>
              <TextField
                label="E-posta"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                error={errors.email}
              />
              <TextField
                ref={passwordRef}
                label="Şifre"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                error={errors.password}
              />

              {serverError && (
                <Text variant="caption" color={colors.danger}>
                  {serverError}
                </Text>
              )}

              <Button
                label="Giriş yap"
                onPress={handleSubmit}
                loading={status === 'loading'}
                fullWidth
                size="lg"
              />
            </View>
          </Card>

          <Button
            label="Hesabın yok mu? Kayıt ol"
            variant="ghost"
            onPress={() => navigation.replace('Register')}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, gap: spacing.xxxl, paddingTop: spacing.xl },
  titles: { gap: spacing.sm },
  form: { gap: spacing.lg },
});
