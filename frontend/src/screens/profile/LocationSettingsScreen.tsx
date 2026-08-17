import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Header,
  ListRow,
  Screen,
  Text,
  TextField,
} from '../../components/ui';
import { WeatherCard } from '../../components/weather';
import { locationService } from '../../services/location/locationService';
import { useAuthStore } from '../../store/authStore';
import { useWeatherStore } from '../../store/weatherStore';
import { colors, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationSettings'>;

export const LocationSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAuthStore((state) => state.user);
  const updateLocation = useAuthStore((state) => state.updateLocation);
  const weather = useWeatherStore((state) => state.weather);
  const fetchWeather = useWeatherStore((state) => state.fetchWeather);
  const loading = useWeatherStore((state) => state.status === 'loading');

  const [city, setCity] = useState(user?.location.city ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleToggleDeviceLocation = async (useDevice: boolean) => {
    setError(null);
    if (useDevice) {
      const location = await locationService.getCurrentLocation();
      if (!location) {
        setError('Konum izni verilmedi. Şehri elle seçebilirsin.');
        return;
      }
      await updateLocation({
        useDeviceLocation: true,
        city: location.city,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      await fetchWeather({ force: true, useDeviceLocation: true });
      setCity(location.city ?? '');
      return;
    }
    await updateLocation({ useDeviceLocation: false });
  };

  const handleSaveCity = async () => {
    setError(null);
    const trimmed = city.trim();
    if (!trimmed) {
      setError('Bir şehir adı gir');
      return;
    }
    const resolved = await locationService.geocodeCity(trimmed);
    if (!resolved) {
      setError('Şehir bulunamadı. Yazımını kontrol et.');
      return;
    }
    await updateLocation({
      useDeviceLocation: false,
      city: resolved.city ?? trimmed,
      latitude: resolved.coords.latitude,
      longitude: resolved.coords.longitude,
    });
    await fetchWeather({
      force: true,
      useDeviceLocation: false,
      city: resolved.city ?? trimmed,
    });
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.headerWrapper}>
        <Header title="Konum" onBack={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="caption" color={colors.textSecondary}>
          Hava durumunu doğru yerden alabilmem için konumunu bilmem gerekiyor.
        </Text>

        <WeatherCard weather={weather} loading={loading} />

        <Card padded={false}>
          <ListRow
            icon="navigate-outline"
            title="Cihaz konumunu kullan"
            subtitle="Bulunduğun şehri otomatik algıla"
            showChevron={false}
            rightSlot={
              <Switch
                value={!!user?.location.useDeviceLocation}
                onValueChange={handleToggleDeviceLocation}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
              />
            }
          />
        </Card>

        {!user?.location.useDeviceLocation && (
          <Card>
            <TextField
              label="Şehir"
              icon="location-outline"
              value={city}
              onChangeText={setCity}
              placeholder="Örn. İstanbul"
              error={error}
            />
            <View style={styles.saveButton}>
              <Button label="Şehri kaydet" onPress={handleSaveCity} fullWidth />
            </View>
          </Card>
        )}

        {error && user?.location.useDeviceLocation && (
          <Text variant="caption" color={colors.danger}>
            {error}
          </Text>
        )}

        <Button
          label="Hava durumunu yenile"
          variant="outline"
          icon="refresh"
          onPress={() => fetchWeather({ force: true })}
          fullWidth
        />
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
  saveButton: { marginTop: spacing.lg },
});
