import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { Outfit } from '../../types/outfit';
import type { WeatherSnapshot } from '../../types/weather';
import { parseTimeString } from '../../utils/date';
import { storage } from '../storage';

/**
 * Sabah kombin bildirimi.
 *
 * Bildirim içeriği hava durumuna ve üretilen kombine göre dinamik hazırlanır.
 * Bildirime dokunulduğunda `data.screen = 'DailyOutfit'` ile ana sayfadaki
 * "Bugünün Kombini" ekranına yönlendirilir (bkz. navigation/linking.ts).
 */

export const NOTIFICATION_CHANNEL_ID = 'daily-outfit';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface DailyNotificationContent {
  title: string;
  body: string;
}

/** Hava durumu + kombine göre bildirim metnini üretir */
export const buildDailyNotificationContent = (
  weather?: WeatherSnapshot | null,
  outfit?: Outfit | null,
  userName?: string,
): DailyNotificationContent => {
  const namePart = userName ? ` ${userName.split(' ')[0]}` : '';
  const title = `☀️ Günaydın${namePart}!`;

  if (!weather) {
    return {
      title,
      body: 'Bugünün kombinini senin için hazırladık. Göz atmak ister misin?',
    };
  }

  const temp = Math.round(weather.temperature);
  const rainy = weather.precipitationProbability >= 40;

  const pieces = outfit?.slots
    .filter((slot) => ['top', 'bottom', 'dress', 'outerwear'].includes(slot.role))
    .map((slot) => slot.item.name.toLocaleLowerCase('tr-TR'))
    .slice(0, 2)
    .join(' + ');

  const weatherPart = `Bugün hava ${temp}°C${rainy ? ' ve yağmurlu' : ''}.`;
  const outfitPart = pieces
    ? `Senin için ${pieces} kombinini hazırladık.`
    : 'Bugünün kombinini senin için hazırladık.';

  return { title, body: `${weatherPart} ${outfitPart}` };
};

export const notificationService = {
  /** İzin ister; verilmezse false döner */
  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      // Simülatörde local bildirim çalışır ancak izin akışı sınırlıdır
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Günlük Kombin',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C2703C',
      sound: 'default',
    });
  },

  /** Her gün belirtilen saatte tekrarlayan bildirimi planlar */
  async scheduleDailyOutfit(
    time: string,
    content: DailyNotificationContent,
  ): Promise<string | null> {
    const granted = await notificationService.requestPermission();
    if (!granted) return null;

    await notificationService.ensureAndroidChannel();
    await notificationService.cancelDailyOutfit();

    const { hour, minute } = parseTimeString(time);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: 'default',
        data: { screen: 'DailyOutfit', type: 'daily-outfit' },
        ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await storage.set(STORAGE_KEYS.scheduledNotificationId, identifier);
    return identifier;
  },

  async cancelDailyOutfit(): Promise<void> {
    const identifier = await storage.get<string>(STORAGE_KEYS.scheduledNotificationId);
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(
        () => undefined,
      );
      await storage.remove(STORAGE_KEYS.scheduledNotificationId);
    }
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    await storage.remove(STORAGE_KEYS.scheduledNotificationId);
  },

  async getScheduled() {
    return Notifications.getAllScheduledNotificationsAsync();
  },

  /** Ayarlar ekranındaki "Örnek bildirim gönder" için */
  async sendPreview(content: DailyNotificationContent): Promise<void> {
    const granted = await notificationService.requestPermission();
    if (!granted) return;
    await notificationService.ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: { screen: 'DailyOutfit', type: 'daily-outfit' },
        ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });
  },

  /** Uzaktan bildirim için Expo push token (backend'e gönderilir) */
  async getPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
          ?.projectId;
      if (!projectId) return null;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;
    } catch {
      return null;
    }
  },
};
