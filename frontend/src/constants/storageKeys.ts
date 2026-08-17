export const STORAGE_KEYS = {
  accessToken: 'kombin.auth.accessToken',
  refreshToken: 'kombin.auth.refreshToken',
  session: 'kombin.auth.session',
  wardrobe: 'kombin.wardrobe.items',
  outfits: 'kombin.outfits',
  settings: 'kombin.settings',
  weatherCache: 'kombin.weather.cache',
  assistantThread: 'kombin.assistant.thread',
  onboarding: 'kombin.onboarding.completed',
  scheduledNotificationId: 'kombin.notifications.dailyId',
  /** Otomatik kombin üretiminin yapıldığı son gün (YYYY-MM-DD) */
  lastAutoOutfitDate: 'kombin.outfits.lastAutoDate',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
