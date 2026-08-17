import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** JSON tabanlı genel amaçlı depolama (gardırop, ayarlar, önbellek) */
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // sessizce yut: depolama hatası akışı kesmemeli
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // yoksay
    }
  },

  async clear(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch {
      // yoksay
    }
  },
};

/**
 * Token gibi hassas veriler için güvenli depolama.
 * expo-secure-store web'de çalışmadığından web'de AsyncStorage'a düşer.
 */
const isSecureAvailable = Platform.OS !== 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      if (!isSecureAvailable) return AsyncStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (!isSecureAvailable) {
        await AsyncStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // yoksay
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (!isSecureAvailable) {
        await AsyncStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // yoksay
    }
  },
};
