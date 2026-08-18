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
  const onboardingCompleted = user?.onboardingCompleted ?? false;

  // Önceki sürümlerden kalmış olabilecek fazla bildirimleri bir kez temizle
  useEffect(() => {
    notificationService.sweepDuplicates().catch(() => undefined);
  }, []);

  useEffect(() => {
    // Kullanıcı saatini onboarding'de seçiyor; öncesinde varsayılan 08:00'i
    // planlarsak kimsenin istemediği bir bildirim kurulmuş oluyor.
    if (!user || !settings || !onboardingCompleted) return;

    const run = async () => {
      // Push token kayıtlıysa bildirimi sunucu gönderiyor. Cihaz da planlarsa
      // aynı saatte iki bildirim gelir; bu yüzden yerel planlama iptal edilir.
      const deliveredByServer = Boolean(settings.pushToken);
      const idle = !settings.dailyOutfitEnabled || deliveredByServer;

      if (idle) {
        const reason = deliveredByServer ? 'remote' : 'disabled';
        if (lastSignature.current !== reason) {
          lastSignature.current = reason;
          await notificationService.cancelDailyOutfit();
        }
        return;
      }

      const content = buildDailyNotificationContent(weather, todayOutfit, user.fullName);
      const signature = `${settings.dailyOutfitTime}|${content.body}`;
      if (signature === lastSignature.current) return;

      // İmza await'ten ÖNCE yazılır: hava/kombin arka arkaya güncellenince
      // aynı anda iki planlama başlayıp iki bildirim kalıyordu.
      const previous = lastSignature.current;
      lastSignature.current = signature;

      const id = await notificationService.scheduleDailyOutfit(
        settings.dailyOutfitTime,
        content,
      );
      if (!id) lastSignature.current = previous;
    };

    run();
  }, [user, settings, onboardingCompleted, weather, todayOutfit]);
};

/**
 * Cihazın Expo push token'ını sunucuya kaydeder.
 *
 * Token yalnızca gerçek cihazda ve development/production build'de üretilir;
 * Expo Go ve simülatörde null döner. O durumda kayıt yapılmaz ve bildirim
 * cihazda yerel olarak planlanmaya devam eder.
 */
export const usePushTokenRegistration = () => {
  const user = useAuthStore((state) => state.user);
  const registerPushToken = useAuthStore((state) => state.registerPushToken);
  const attempted = useRef(false);

  const enabled = user?.notifications?.dailyOutfitEnabled ?? false;
  const onboardingCompleted = user?.onboardingCompleted ?? false;

  useEffect(() => {
    if (!user || !enabled || !onboardingCompleted || attempted.current) return;

    const run = async () => {
      // İzin diyaloğu burada açılmaz; onboarding'de zaten soruluyor.
      if (!(await notificationService.hasPermission())) return;

      attempted.current = true;
      const token = await notificationService.getPushToken();
      if (!token) return;

      await registerPushToken(token, notificationService.getTimezone());
    };

    run();
  }, [user, enabled, onboardingCompleted, registerPushToken]);
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

  const previewText = buildDailyNotificationContent(weather, todayOutfit, user?.fullName);

  return { setEnabled, setTime, previewText };
};
