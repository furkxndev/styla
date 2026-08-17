import { create } from 'zustand';
import { config } from '../constants/config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { weatherApi } from '../services/api';
import { DEFAULT_LOCATION, locationService } from '../services/location/locationService';
import { storage } from '../services/storage';
import { ApiError, type AsyncStatus } from '../types/api';
import type { WeatherSnapshot } from '../types/weather';

interface WeatherState {
  weather: WeatherSnapshot | null;
  status: AsyncStatus;
  error: string | null;
  /** Konum izni reddedildiğinde varsayılan şehir kullanılıyor mu */
  usingFallbackLocation: boolean;

  hydrate: () => Promise<void>;
  fetchWeather: (options?: {
    force?: boolean;
    useDeviceLocation?: boolean;
    city?: string;
  }) => Promise<WeatherSnapshot | null>;
  reset: () => void;
}

const isFresh = (weather: WeatherSnapshot | null) => {
  if (!weather) return false;
  return Date.now() - new Date(weather.fetchedAt).getTime() < config.weather.cacheTtlMs;
};

export const useWeatherStore = create<WeatherState>((set, get) => ({
  weather: null,
  status: 'idle',
  error: null,
  usingFallbackLocation: false,

  async hydrate() {
    const cached = await storage.get<WeatherSnapshot>(STORAGE_KEYS.weatherCache);
    if (cached) set({ weather: cached, status: 'success' });
  },

  async fetchWeather(options) {
    const { force = false, useDeviceLocation = true, city } = options ?? {};
    const current = get().weather;

    if (!force && isFresh(current)) return current;

    set({ status: 'loading', error: null });

    try {
      let coords = DEFAULT_LOCATION.coords;
      let resolvedCity = city ?? DEFAULT_LOCATION.city;
      let fallback = true;

      if (city) {
        const geocoded = await locationService.geocodeCity(city);
        if (geocoded) {
          coords = geocoded.coords;
          resolvedCity = geocoded.city ?? city;
          fallback = false;
        }
      } else if (useDeviceLocation) {
        const device = await locationService.getCurrentLocation();
        if (device) {
          coords = device.coords;
          resolvedCity = device.city ?? resolvedCity;
          fallback = false;
        }
      }

      const weather = await weatherApi.current(coords, resolvedCity);
      set({ weather, status: 'success', usingFallbackLocation: fallback });
      await storage.set(STORAGE_KEYS.weatherCache, weather);
      return weather;
    } catch (error) {
      // Bağlantı yoksa önbellekteki veriyle devam et
      set({
        status: current ? 'success' : 'error',
        error: error instanceof ApiError ? error.message : 'Hava durumu bilgisi alınamadı.',
      });
      return current;
    }
  },

  reset() {
    set({ weather: null, status: 'idle', error: null });
  },
}));
