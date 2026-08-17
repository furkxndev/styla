import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StylaMark } from '../../components/brand';
import { Button, Card, Divider, Screen, Text } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const FEATURES = [
  {
    icon: 'camera-outline' as const,
    title: 'Gardırobunu dijitalleştir',
    description: 'Fotoğrafını çek, AI kategori ve rengi kendisi belirlesin.',
  },
  {
    icon: 'partly-sunny-outline' as const,
    title: 'Havaya göre kombin',
    description: 'Sıcaklık, yağış ve rüzgâra göre her sabah hazır öneri.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Seni öğrenen asistan',
    description: 'Beğenilerinle zamanla senin tarzını öğrenir.',
  },
];

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => (
  <Screen edges={['top', 'bottom']} contentContainerStyle={styles.container}>
    <View style={styles.hero}>
      {/* Açılış animasyonuyla aynı işaret ve kelime işareti: marka tutarlı kalır */}
      <StylaMark size={72} style={styles.logo} />

      <View style={styles.titles}>
        <Text variant="brand" style={styles.wordmark}>
          STYLA
        </Text>
        <Text variant="body" color={colors.textSecondary}>
          Yapay zekâ destekli kişisel stil asistanın. Sabahları ne giyeceğini düşünme — biz
          senin için hazırlayalım.
        </Text>
      </View>
    </View>

    <Card variant="subtle" style={styles.featureCard}>
      <View style={styles.features}>
        {FEATURES.map((feature, index) => (
          <View key={feature.title}>
            {index > 0 && <Divider />}
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={19} color={colors.accentDark} />
              </View>
              <View style={styles.featureTexts}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {feature.title}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {feature.description}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Card>

    <View style={styles.actions}>
      <Button
        label="Hesap oluştur"
        onPress={() => navigation.navigate('Register')}
        fullWidth
        size="lg"
      />
      <Button
        label="Zaten hesabım var"
        variant="ghost"
        onPress={() => navigation.navigate('Login')}
        fullWidth
      />
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', paddingVertical: spacing.xxl },
  hero: { gap: spacing.xxl, marginTop: spacing.xxl },
  logo: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
  // Harf aralığı sağa boşluk ekler; sola aynı miktar verilerek optik hizalanır
  wordmark: { marginLeft: 6 },
  titles: { gap: spacing.md },
  featureCard: { marginVertical: spacing.lg },
  features: { gap: spacing.md },
  feature: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTexts: { flex: 1, gap: spacing.xxs },
  actions: { gap: spacing.sm },
});
