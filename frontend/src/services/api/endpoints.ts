/**
 * Backend ile paylaşılan uç nokta sözleşmesi.
 * Backend geliştirilirken bu dosya tek referans noktasıdır.
 */
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  user: {
    update: '/users/me',
    preferences: '/users/me/preferences',
    notifications: '/users/me/notifications',
    pushToken: '/users/me/push-token',
    stats: '/users/me/stats',
  },
  wardrobe: {
    list: '/wardrobe/items',
    detail: (id: string) => `/wardrobe/items/${id}`,
    create: '/wardrobe/items',
    update: (id: string) => `/wardrobe/items/${id}`,
    remove: (id: string) => `/wardrobe/items/${id}`,
    analyze: '/wardrobe/analyze', // multipart görsel -> AI analizi
    upload: '/wardrobe/upload',
    toggleFavorite: (id: string) => `/wardrobe/items/${id}/favorite`,
  },
  outfits: {
    generate: '/outfits/generate',
    today: '/outfits/today',
    list: '/outfits',
    detail: (id: string) => `/outfits/${id}`,
    feedback: (id: string) => `/outfits/${id}/feedback`,
    wear: (id: string) => `/outfits/${id}/wear`,
    remove: (id: string) => `/outfits/${id}`,
  },
  weather: {
    current: '/weather/current',
  },
  assistant: {
    chat: '/assistant/chat',
    thread: '/assistant/thread',
  },
} as const;
