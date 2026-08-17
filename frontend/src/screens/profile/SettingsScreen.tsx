import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, Header, ListRow, Screen, Text, TextField } from '../../components/ui';
import { config } from '../../constants/config';
import { resetMockDb } from '../../services/mock/mockServer';
import { useAssistantStore } from '../../store/assistantStore';
import { useAuthStore } from '../../store/authStore';
import { useOutfitStore } from '../../store/outfitStore';
import { useWardrobeStore } from '../../store/wardrobeStore';
import { useWeatherStore } from '../../store/weatherStore';
import { colors, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const resetWardrobe = useWardrobeStore((state) => state.reset);
  const fetchItems = useWardrobeStore((state) => state.fetchItems);
  const resetOutfits = useOutfitStore((state) => state.reset);
  const resetAssistant = useAssistantStore((state) => state.reset);
  const resetWeather = useWeatherStore((state) => state.reset);

  const [fullName, setFullName] = useState(user?.fullName ?? '');

  const handleNameBlur = () => {
    const trimmed = fullName.trim();
    if (trimmed && trimmed !== user?.fullName) updateProfile({ fullName: trimmed });
  };

  const handleResetDemoData = () => {
    Alert.alert(
      'Demo verilerini sıfırla',
      'Gardırop, kombinler ve sohbet geçmişi başlangıç durumuna dönecek. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            await resetMockDb();
            resetWardrobe();
            resetOutfits();
            resetAssistant();
            resetWeather();
            await fetchItems();
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header title="Ayarlar" onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <TextField
            label="Ad Soyad"
            value={fullName}
            onChangeText={setFullName}
            onBlur={handleNameBlur}
            placeholder="Adın Soyadın"
          />
          <View style={styles.emailRow}>
            <Text variant="caption" color={colors.textTertiary}>
              E-posta
            </Text>
            <Text variant="body">{user?.email}</Text>
          </View>
        </Card>

        <Card padded={false}>
          <ListRow
            icon="color-palette-outline"
            title="Stil tercihleri"
            onPress={() => navigation.navigate('StylePreferences')}
          />
          <ListRow
            icon="notifications-outline"
            title="Bildirimler"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <ListRow
            icon="location-outline"
            title="Konum"
            onPress={() => navigation.navigate('LocationSettings')}
          />
        </Card>

        <Card padded={false}>
          <ListRow
            icon="information-circle-outline"
            title="Sürüm"
            value={Constants.expoConfig?.version ?? '1.0.0'}
            showChevron={false}
          />
          <ListRow
            icon="server-outline"
            title="Veri kaynağı"
            value={config.useMockApi ? 'Demo (yerel)' : 'Sunucu'}
            showChevron={false}
          />
        </Card>

        {config.useMockApi && (
          <Card padded={false}>
            <ListRow
              icon="refresh-outline"
              title="Demo verilerini sıfırla"
              subtitle="Backend bağlanana kadar kullanılan yerel veriler"
              destructive
              showChevron={false}
              onPress={handleResetDemoData}
            />
          </Card>
        )}

        <Text variant="caption" color={colors.textTertiary} style={styles.note}>
          Styla — AI Kişisel Stil Asistanı
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerWrapper: { paddingHorizontal: spacing.xl },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  emailRow: { marginTop: spacing.lg, gap: spacing.xxs },
  note: { textAlign: 'center', marginTop: spacing.lg },
});
