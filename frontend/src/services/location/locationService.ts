import * as Location from 'expo-location';
import type { Coordinates } from '../../types/weather';

export interface ResolvedLocation {
  coords: Coordinates;
  city?: string;
}

/** Varsayılan konum: kullanıcı izin vermezse İstanbul kullanılır */
export const DEFAULT_LOCATION: ResolvedLocation = {
  coords: { latitude: 41.0082, longitude: 28.9784 },
  city: 'İstanbul',
};

export const locationService = {
  async hasPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  },

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /** İzin varsa cihaz konumunu, yoksa null döner */
  async getCurrentLocation(): Promise<ResolvedLocation | null> {
    try {
      const granted =
        (await locationService.hasPermission()) ||
        (await locationService.requestPermission());
      if (!granted) return null;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      const city = await locationService.reverseGeocode(coords);
      return { coords, city };
    } catch {
      return null;
    }
  },

  async reverseGeocode(coords: Coordinates): Promise<string | undefined> {
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      const first = results[0];
      return first?.city ?? first?.subregion ?? first?.region ?? undefined;
    } catch {
      return undefined;
    }
  },

  /** Kullanıcı şehir adını elle girdiğinde koordinata çevirir */
  async geocodeCity(city: string): Promise<ResolvedLocation | null> {
    try {
      const results = await Location.geocodeAsync(city);
      const first = results[0];
      if (!first) return null;
      return {
        coords: { latitude: first.latitude, longitude: first.longitude },
        city,
      };
    } catch {
      return null;
    }
  },
};
