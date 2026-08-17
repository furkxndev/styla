import { useCallback, useEffect, useMemo } from 'react';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '../store/authStore';
import type { AiFeature, AiModelOption } from '../types/admin';

/**
 * Admin ekranlarının ortak veri kancaları.
 * `enabled` bayrağı var çünkü ekranlar yetki kontrolünden ÖNCE hook çağırmak
 * zorunda (hook kuralları); yetkisiz kullanıcıda istek atılmamalı.
 */

// --- Biçimlendiriciler ------------------------------------------------------
// Admin ekranlarının tamamı aynı para/token biçimini kullanıyor; utils/format.ts
// paylaşılan bir dosya olduğu için bu yardımcılar burada duruyor.

/** OpenRouter maliyetleri çok küçük olabildiği için 4 ondalık gösteriyoruz */
export const formatUsd = (value: number, fractionDigits = 4) =>
  `$${value.toFixed(fractionDigits)}`;

/** Model fiyatı token başına gelir; okunabilir olması için 1M token'a çeviriyoruz */
export const formatPricePerMillion = (pricePerToken: number) => {
  const perMillion = pricePerToken * 1_000_000;
  if (perMillion === 0) return 'Ücretsiz';
  return `$${perMillion >= 1 ? perMillion.toFixed(2) : perMillion.toFixed(3)} / 1M`;
};

export const formatCompact = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}B` : String(value);

export const formatContextLength = (length: number) =>
  length >= 1000 ? `${Math.round(length / 1000)}K bağlam` : `${length} bağlam`;

export const FEATURE_LABELS: Record<AiFeature, string> = {
  outfit: 'Kombin',
  analysis: 'Analiz',
  assistant: 'Asistan',
};

// --- Kancalar ---------------------------------------------------------------

/** Yönetim özeti + AI kullanımı (Dashboard) */
export const useAdminOverview = (enabled = true) => {
  const overview = useAdminStore((state) => state.overview);
  const status = useAdminStore((state) => state.overviewStatus);
  const error = useAdminStore((state) => state.overviewError);
  const fetchOverview = useAdminStore((state) => state.fetchOverview);

  useEffect(() => {
    if (enabled && status === 'idle') fetchOverview();
  }, [enabled, status, fetchOverview]);

  const refresh = useCallback(() => fetchOverview({ silent: true }), [fetchOverview]);

  return {
    overview,
    usage: overview?.ai ?? null,
    settings: overview?.settings ?? null,
    loading: status === 'loading',
    error,
    refresh,
  };
};

/** Kullanıcı listesi: filtreler değiştikçe kendini yeniler */
export const useAdminUsers = (enabled = true) => {
  const users = useAdminStore((state) => state.users);
  const status = useAdminStore((state) => state.usersStatus);
  const error = useAdminStore((state) => state.usersError);
  const filters = useAdminStore((state) => state.filters);
  const total = useAdminStore((state) => state.total);
  const hasMore = useAdminStore((state) => state.hasMore);
  const loadingMore = useAdminStore((state) => state.loadingMore);
  const fetchUsers = useAdminStore((state) => state.fetchUsers);
  const loadMoreUsers = useAdminStore((state) => state.loadMoreUsers);
  const setFilters = useAdminStore((state) => state.setFilters);

  // Filtre nesnesi her setFilters'ta yeniden üretiliyor; effect'i alanlara bağlıyoruz
  const { search, role, isActive } = filters;

  useEffect(() => {
    if (!enabled) return;
    fetchUsers();
  }, [enabled, search, role, isActive, fetchUsers]);

  return {
    users,
    total,
    hasMore,
    loadingMore,
    filters,
    setFilters,
    loadMore: loadMoreUsers,
    refresh: useCallback(() => fetchUsers({ silent: true }), [fetchUsers]),
    loading: status === 'loading',
    error,
    isEmpty: status === 'success' && users.length === 0,
  };
};

/** Ayarlar ekranı: ayarlar + model kataloğu */
export const useAdminSettings = (enabled = true) => {
  const settings = useAdminStore((state) => state.settings);
  const status = useAdminStore((state) => state.settingsStatus);
  const error = useAdminStore((state) => state.settingsError);
  const saving = useAdminStore((state) => state.saving);
  const models = useAdminStore((state) => state.models);
  const modelsStatus = useAdminStore((state) => state.modelsStatus);
  const fetchSettings = useAdminStore((state) => state.fetchSettings);
  const fetchModels = useAdminStore((state) => state.fetchModels);
  const saveSettings = useAdminStore((state) => state.saveSettings);

  useEffect(() => {
    if (!enabled) return;
    if (status === 'idle') fetchSettings();
    if (modelsStatus === 'idle') fetchModels();
  }, [enabled, status, modelsStatus, fetchSettings, fetchModels]);

  const visionModels = useMemo(
    () => models.filter((model: AiModelOption) => model.supportsImages),
    [models],
  );

  return {
    settings,
    models,
    visionModels,
    modelsLoading: modelsStatus === 'loading',
    saveSettings,
    saving,
    loading: status === 'loading',
    error,
  };
};

/** Ekranların yetki kontrolü için tek kaynak */
export const useIsAdmin = () => useAuthStore((state) => state.user?.role === 'admin');
