import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Header, Screen, Text, TextField } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { validateEmail, validateFullName, validatePassword } from '../../utils/validation';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);
  const serverError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  // Ad → e-posta → şifre zinciri
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const nextErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    clearError();
    await register({ fullName: fullName.trim(), email: email.trim(), password });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titles}>
            <Text variant="title1">Hesabını oluştur</Text>
            <Text variant="body" color={colors.textSecondary}>
              Birkaç adımda gardırobunu kur, sabahları kombin derdi bitsin.
            </Text>
          </View>

          <Card>
            <View style={styles.form}>
              <TextField
                label="Ad Soyad"
                icon="person-outline"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Adın Soyadın"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
                error={errors.fullName}
              />
              <TextField
                ref={emailRef}
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
                placeholder="En az 6 karakter"
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
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
                label="Hesap oluştur"
                onPress={handleSubmit}
                loading={status === 'loading'}
                fullWidth
                size="lg"
              />

              <Text variant="caption" color={colors.textTertiary} align="center">
                Devam ederek kullanım koşullarını kabul etmiş olursun.
              </Text>
            </View>
          </Card>

          <Button
            label="Zaten hesabım var"
            variant="ghost"
            onPress={() => navigation.replace('Login')}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.xxxl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  titles: { gap: spacing.sm },
  form: { gap: spacing.lg },
});
