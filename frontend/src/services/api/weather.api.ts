import { config } from '../../constants/config';
import type { Coordinates, WeatherSnapshot } from '../../types/weather';
import { mockWeather } from '../mock/mockServer';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';

export const weatherApi = {
  /**
   * Hava durumu backend üzerinden çekilir (API anahtarı istemcide tutulmaz).
   */
  current: (coords?: Coordinates, city?: string): Promise<WeatherSnapshot> =>
    config.useMockApi
      ? mockWeather.current(coords?.latitude, coords?.longitude, city)
      : apiClient.get<WeatherSnapshot>(ENDPOINTS.weather.current, {
          query: {
            lat: coords?.latitude,
            lon: coords?.longitude,
            city,
          },
        }),
};
