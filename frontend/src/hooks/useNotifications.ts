import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  buildDailyNotificationContent,
  notificationService,
} from '../services/notifications/notificationService';
import { useAuthStore } from '../store/authStore';
import { useOutfitStore } from '../store/outfitStore';
import { useWeatherStore } from '../store/weatherStore';

/**
 * Sabah kombin bildirimini kullanıcı ayarlarına göre planlar.
 * Bildirim metni güncel hava durumu ve üretilen kombine göre yeniden yazılır.
 */
export const useDailyNotificationScheduler = () => {
  const user = useAuthStore((state) => state.user);
  const weather = useWeatherStore((state) => state.weather);
  const todayOutfit = useOutfitStore((state) => state.todayOutfit);
  const lastSignature = useRef<string | null>(null);

  const settings = user?.notifications;

  useEffect(() => {
    if (!user || !settings) return;

    const run = async () => {
      if (!settings.dailyOutfitEnabled) {
        if (lastSignature.current !== 'disabled') {
          await notificationService.cancelDailyOutfit();
          lastSignature.current = 'disabled';
        }
        return;
      }

      const content = buildDailyNotificationContent(weather, todayOutfit, user.fullName);
      const signature = `${settings.dailyOutfitTime}|${content.body}`;
      if (signature === lastSignature.current) return;

      const id = await notificationService.scheduleDailyOutfit(
        settings.dailyOutfitTime,
        content,
      );
      lastSignature.current = id ? signature : null;
    };

    run();
  }, [user, settings, weather, todayOutfit]);
};

/** Bildirime dokunulduğunda ilgili ekrana yönlendirir */
export const useNotificationResponse = (onNavigate: (screen: string) => void) => {
  const handler = useCallback(
    (response: Notifications.NotificationResponse) => {
      const screen = response.notification.request.content.data?.screen;
      if (typeof screen === 'string') onNavigate(screen);
    },
    [onNavigate],
  );

  useEffect(() => {
    // Uygulama bildirimden açıldıysa
    let mounted = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (mounted && response) handler(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(handler);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [handler]);
};

/** Ayarlar ekranında kullanılan yardımcılar */
export const useNotificationControls = () => {
  const user = useAuthStore((state) => state.user);
  const weather = useWeatherStore((state) => state.weather);
  const todayOutfit = useOutfitStore((state) => state.todayOutfit);
  const updateNotifications = useAuthStore((state) => state.updateNotifications);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const granted = await notificationService.requestPermission();
        if (!granted) return false;
      } else {
        await notificationService.cancelDailyOutfit();
      }
      await updateNotifications({ dailyOutfitEnabled: enabled });
      return true;
    },
    [updateNotifications],
  );

  const setTime = useCallback(
    async (time: string) => {
      await updateNotifications({ dailyOutfitTime: time });
    },
    [updateNotifications],
  );

  const sendPreview = useCallback(async () => {
    const content = buildDailyNotificationContent(weather, todayOutfit, user?.fullName);
    await notificationService.sendPreview(content);
  }, [todayOutfit, user?.fullName, weather]);

  const previewText = buildDailyNotificationContent(weather, todayOutfit, user?.fullName);

  return { setEnabled, setTime, sendPreview, previewText };
};
