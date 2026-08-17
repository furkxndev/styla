import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWeatherStore } from '../store/weatherStore';

/**
 * Uygulama açılışında yapılması gerekenler:
 * depolanan oturumu ve hava durumu önbelleğini okur.
 */
export const useAppBootstrap = () => {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrateWeather = useWeatherStore((state) => state.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await Promise.all([hydrateAuth(), hydrateWeather()]);
      if (!cancelled) setReady(true);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, hydrateWeather]);

  return { ready: ready && hydrated };
};
