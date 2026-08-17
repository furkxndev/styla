import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWeatherStore } from '../store/weatherStore';
import { buildWeatherAdvice } from '../utils/weather';

/**
 * Hava durumunu kullanıcı ayarlarına göre çeker.
 * Kullanıcı cihaz konumunu kapattıysa profilindeki şehir kullanılır.
 */
export const useWeather = (autoFetch = true) => {
  const user = useAuthStore((state) => state.user);
  const weather = useWeatherStore((state) => state.weather);
  const status = useWeatherStore((state) => state.status);
  const error = useWeatherStore((state) => state.error);
  const fetchWeather = useWeatherStore((state) => state.fetchWeather);

  const refresh = useCallback(
    (force = false) =>
      fetchWeather({
        force,
        useDeviceLocation: user?.location.useDeviceLocation ?? true,
        city: user?.location.useDeviceLocation ? undefined : user?.location.city,
      }),
    [fetchWeather, user?.location.useDeviceLocation, user?.location.city],
  );

  useEffect(() => {
    if (autoFetch) refresh();
  }, [autoFetch, refresh]);

  return {
    weather,
    advice: weather ? buildWeatherAdvice(weather) : null,
    loading: status === 'loading',
    error,
    refresh,
  };
};
