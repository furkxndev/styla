import { useEffect, useMemo } from 'react';
import { applyWardrobeFilters, useWardrobeStore } from '../store/wardrobeStore';
import type { ClothingCategory } from '../types/clothing';
import { canGenerateOutfit, missingCategoriesFor } from '../utils/outfitEngine';

/** Gardırop verisini, filtrelenmiş listeyi ve kategori sayımlarını verir */
export const useWardrobe = (autoFetch = true) => {
  const items = useWardrobeStore((state) => state.items);
  const status = useWardrobeStore((state) => state.status);
  const error = useWardrobeStore((state) => state.error);
  const filters = useWardrobeStore((state) => state.filters);
  const fetchItems = useWardrobeStore((state) => state.fetchItems);
  const setFilters = useWardrobeStore((state) => state.setFilters);
  const resetFilters = useWardrobeStore((state) => state.resetFilters);
  const toggleFavorite = useWardrobeStore((state) => state.toggleFavorite);
  const removeItem = useWardrobeStore((state) => state.removeItem);

  useEffect(() => {
    if (autoFetch && status === 'idle') fetchItems();
  }, [autoFetch, fetchItems, status]);

  const filteredItems = useMemo(
    () => applyWardrobeFilters(items, filters),
    [items, filters],
  );

  const counts = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + 1;
        return acc;
      }, {}),
    [items],
  );

  const favorites = useMemo(() => items.filter((item) => item.isFavorite), [items]);

  return {
    items,
    filteredItems,
    favorites,
    counts,
    filters,
    setFilters,
    resetFilters,
    toggleFavorite,
    removeItem,
    refresh: () => fetchItems({ silent: true }),
    loading: status === 'loading',
    error,
    isEmpty: status === 'success' && items.length === 0,
    canGenerateOutfit: canGenerateOutfit(items),
    missingCategories: missingCategoriesFor(items),
    countFor: (category: ClothingCategory) => counts[category] ?? 0,
  };
};
