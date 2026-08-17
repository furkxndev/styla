import { create } from 'zustand';
import { wardrobeApi } from '../services/api';
import { ApiError, type AsyncStatus } from '../types/api';
import type {
  ClothingAnalysisResult,
  ClothingItem,
  CreateClothingItemPayload,
  UpdateClothingItemPayload,
  WardrobeFilters,
} from '../types/clothing';

interface WardrobeState {
  items: ClothingItem[];
  status: AsyncStatus;
  error: string | null;
  filters: WardrobeFilters;
  /** AI analizi sürüyor mu */
  analyzing: boolean;

  fetchItems: (options?: { silent?: boolean }) => Promise<void>;
  addItem: (payload: CreateClothingItemPayload) => Promise<ClothingItem | null>;
  updateItem: (id: string, patch: UpdateClothingItemPayload) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  analyzeImage: (imageUri: string) => Promise<ClothingAnalysisResult | null>;
  setFilters: (filters: Partial<WardrobeFilters>) => void;
  resetFilters: () => void;
  getItemById: (id: string) => ClothingItem | undefined;
  reset: () => void;
}

const defaultFilters: WardrobeFilters = { category: 'all' };

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  items: [],
  status: 'idle',
  error: null,
  filters: defaultFilters,
  analyzing: false,

  async fetchItems(options) {
    if (!options?.silent) set({ status: 'loading', error: null });
    try {
      const items = await wardrobeApi.list();
      set({ items, status: 'success' });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof ApiError ? error.message : 'Gardırop yüklenemedi.',
      });
    }
  },

  async addItem(payload) {
    try {
      const item = await wardrobeApi.create(payload);
      set({ items: [item, ...get().items] });
      return item;
    } catch (error) {
      set({ error: error instanceof ApiError ? error.message : 'Ürün eklenemedi.' });
      return null;
    }
  },

  async updateItem(id, patch) {
    const previous = get().items;
    // Optimistic update
    set({
      items: previous.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
      ),
    });
    try {
      const updated = await wardrobeApi.update(id, patch);
      set({ items: get().items.map((item) => (item.id === id ? updated : item)) });
    } catch (error) {
      set({
        items: previous,
        error: error instanceof ApiError ? error.message : 'Ürün güncellenemedi.',
      });
    }
  },

  async removeItem(id) {
    const previous = get().items;
    set({ items: previous.filter((item) => item.id !== id) });
    try {
      await wardrobeApi.remove(id);
    } catch (error) {
      set({
        items: previous,
        error: error instanceof ApiError ? error.message : 'Ürün silinemedi.',
      });
    }
  },

  async toggleFavorite(id) {
    const previous = get().items;
    set({
      items: previous.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item,
      ),
    });
    try {
      const updated = await wardrobeApi.toggleFavorite(id);
      set({ items: get().items.map((item) => (item.id === id ? updated : item)) });
    } catch {
      set({ items: previous });
    }
  },

  async analyzeImage(imageUri) {
    set({ analyzing: true, error: null });
    try {
      const result = await wardrobeApi.analyzeImage(imageUri);
      return result;
    } catch (error) {
      set({
        error:
          error instanceof ApiError
            ? error.message
            : 'Görsel analiz edilemedi. Bilgileri elle girebilirsin.',
      });
      return null;
    } finally {
      set({ analyzing: false });
    }
  },

  setFilters(filters) {
    set({ filters: { ...get().filters, ...filters } });
  },

  resetFilters() {
    set({ filters: defaultFilters });
  },

  getItemById(id) {
    return get().items.find((item) => item.id === id);
  },

  reset() {
    set({ items: [], status: 'idle', error: null, filters: defaultFilters });
  },
}));

/** Filtreleri uygulayan saf yardımcı (bileşenlerde memo ile kullanılır) */
export const applyWardrobeFilters = (
  items: ClothingItem[],
  filters: WardrobeFilters,
): ClothingItem[] => {
  const query = filters.query?.trim().toLocaleLowerCase('tr-TR');

  return items.filter((item) => {
    if (
      filters.category &&
      filters.category !== 'all' &&
      item.category !== filters.category
    ) {
      return false;
    }
    if (filters.season && !item.seasons.includes(filters.season)) return false;
    if (filters.colorFamily && !item.colors.some((c) => c.family === filters.colorFamily)) {
      return false;
    }
    if (filters.style && !item.styles.includes(filters.style)) return false;
    if (filters.favoritesOnly && !item.isFavorite) return false;
    if (query) {
      const haystack = [
        item.name,
        item.subcategory,
        item.brand,
        ...item.colors.map((c) => c.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
};
