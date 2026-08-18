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

/** Planlanmış bildirimler arasında günlük kombini tanımak için (data.type) */
const DAILY_NOTIFICATION_TYPE = 'daily-outfit';
/**
 * Planlama/iptal işlemlerini sıraya sokar.
 *
 * Hava durumu ve kombin ayrı ayrı yüklendiği için planlayıcı kısa aralıklarla
 * birden fazla kez tetiklenebiliyordu. Eşzamanlı iki çağrı aynı eski id'yi
 * iptal edip iki yeni bildirim planlıyor, sadece sonuncusunun id'si
 * saklandığı için diğeri "yetim" kalıp her gün fazladan bildirim üretiyordu.
 */
let queue: Promise<unknown> = Promise.resolve();
const serialize = <T,>(task: () => Promise<T>): Promise<T> => {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
};

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

/** Planlanmış günlük kombin bildirimlerinin tamamı */
const getDailyRequests = async (): Promise<Notifications.NotificationRequest[]> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(
    () => [] as Notifications.NotificationRequest[],
  );
  return scheduled.filter(
    (request) => request.content.data?.type === DAILY_NOTIFICATION_TYPE,
  );
};

/**
 * `keep` dışındaki tüm günlük kombin bildirimlerini iptal eder ve iptal edilen
 * adedi döner. Yalnızca depodaki id'ye güvenmek yetmiyor; id'si kaybolmuş
 * bildirimler de burada yakalanır.
 */
const clearDailyNotifications = async (options?: {
  keep?: string | null;
}): Promise<number> => {
  const requests = await getDailyRequests();
  const targets = requests.filter((request) => request.identifier !== options?.keep);

  await Promise.all(
    targets.map((request) =>
      Notifications.cancelScheduledNotificationAsync(request.identifier).catch(
        () => undefined,
      ),
    ),
  );

  if (!options?.keep) {
    const stored = await storage.get<string>(STORAGE_KEYS.scheduledNotificationId);
    if (stored) {
      await Notifications.cancelScheduledNotificationAsync(stored).catch(
        () => undefined,
      );
    }
    await storage.remove(STORAGE_KEYS.scheduledNotificationId);
  }

  return targets.length;
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

  /** İzin diyaloğu açmadan mevcut durumu okur */
  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  /** Sunucunun bildirim saatini doğru hesaplaması için cihazın saat dilimi */
  getTimezone(): string | null {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
      return null;
    }
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
    return serialize(async () => {
      const granted = await notificationService.requestPermission();
      if (!granted) return null;

      await notificationService.ensureAndroidChannel();
      // Yeni planlamadan önce eskilerin tamamı (yetimler dahil) temizlenir
      await clearDailyNotifications();

      const { hour, minute } = parseTimeString(time);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          sound: 'default',
          data: { screen: 'DailyOutfit', type: DAILY_NOTIFICATION_TYPE },
          ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      // Emniyet kemeri: bu id dışında günlük kombin bildirimi kalmamalı
      await clearDailyNotifications({ keep: identifier });
      await storage.set(STORAGE_KEYS.scheduledNotificationId, identifier);
      return identifier;
    });
  },

  async cancelDailyOutfit(): Promise<void> {
    await serialize(() => clearDailyNotifications());
  },

  /**
   * Uygulama açılışında çağrılır: geçmiş sürümlerden kalan fazla bildirimleri
   * temizler. Kayıtlı id'ye dokunulmaz; planlayıcı zaten yeniden planlar.
   */
  async sweepDuplicates(): Promise<number> {
    return serialize(async () => {
      const scheduled = await getDailyRequests();
      if (scheduled.length <= 1) return 0;

      const keepId = await storage.get<string>(STORAGE_KEYS.scheduledNotificationId);
      const keep = scheduled.some((request) => request.identifier === keepId)
        ? keepId
        : scheduled[scheduled.length - 1].identifier;

      const removed = await clearDailyNotifications({ keep });
      await storage.set(STORAGE_KEYS.scheduledNotificationId, keep as string);
      return removed;
    });
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    await storage.remove(STORAGE_KEYS.scheduledNotificationId);
  },

  async getScheduled() {
    return Notifications.getAllScheduledNotificationsAsync();
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
