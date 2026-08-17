import { useCallback, useEffect, useMemo } from 'react';
import { useOutfitStore } from '../store/outfitStore';
import { useWardrobeStore } from '../store/wardrobeStore';
import { useWeatherStore } from '../store/weatherStore';
import type { DislikeReason, Occasion, Outfit } from '../types/outfit';
import { todayKey } from '../utils/date';
import { canGenerateOutfit } from '../utils/outfitEngine';

/**
 * "Bugünün Kombini" akışını yönetir:
 * hava durumu + gardırop hazır olduğunda kombin yoksa otomatik üretir.
 */
export const useDailyOutfit = () => {
  const items = useWardrobeStore((state) => state.items);
  const wardrobeStatus = useWardrobeStore((state) => state.status);
  const weather = useWeatherStore((state) => state.weather);
  const weatherStatus = useWeatherStore((state) => state.status);

  const todayOutfit = useOutfitStore((state) => state.todayOutfit);
  const generating = useOutfitStore((state) => state.generating);
  const error = useOutfitStore((state) => state.error);
  const occasion = useOutfitStore((state) => state.selectedOccasion);
  const generate = useOutfitStore((state) => state.generate);
  const fetchToday = useOutfitStore((state) => state.fetchToday);
  const ensureTodayOutfit = useOutfitStore((state) => state.ensureTodayOutfit);
  const todayChecked = useOutfitStore((state) => state.todayChecked);
  const selectOccasion = useOutfitStore((state) => state.selectOccasion);
  const outfitsByOccasion = useOutfitStore((state) => state.outfitsByOccasion);
  const pendingOccasion = useOutfitStore((state) => state.pendingOccasion);
  const like = useOutfitStore((state) => state.like);
  const dislike = useOutfitStore((state) => state.dislike);
  const markWorn = useOutfitStore((state) => state.markWorn);

  // Hava durumu gelmeden kombin üretilirse öneri havadan bağımsız kalır;
  // bu yüzden ya veriyi ya da kesin bir hata sonucunu bekliyoruz.
  const weatherResolved = !!weather || weatherStatus === 'error';
  const ready = wardrobeStatus === 'success' && weatherResolved && canGenerateOutfit(items);
  const isForToday = todayOutfit?.date === todayKey();

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  /**
   * Günün kombini yoksa GÜNDE BİR KEZ üretilir.
   *
   * `todayChecked` beklenir: sunucudan "bugün için kombin var mı" cevabı
   * gelmeden üretime girilirse uygulamanın her açılışında yeni kombin
   * oluşurdu (gereksiz AI maliyeti + geçmiş kirliliği).
   */
  useEffect(() => {
    if (!ready || !todayChecked || generating) return;
    if (todayOutfit && isForToday) return;
    ensureTodayOutfit({ occasion, weather });
  }, [
    ready,
    todayChecked,
    generating,
    todayOutfit,
    isForToday,
    ensureTodayOutfit,
    occasion,
    weather,
  ]);

  /** Kullanıcının açık isteğiyle yeni kombin (otomatik değil) */
  const regenerate = useCallback(
    async () => generate({ occasion, weather, regenerate: true }),
    [generate, occasion, weather],
  );

  /**
   * Ortam değişimi kombin ÜRETMEZ; önce hazır kombin aranır
   * (önbellek → sunucu), yalnızca hiç yoksa üretilir.
   */
  const changeOccasion = useCallback(
    async (next: Occasion) => selectOccasion(next, weather),
    [selectOccasion, weather],
  );

  const handleDislike = useCallback(
    async (reason?: DislikeReason) => {
      if (!todayOutfit) return;
      await dislike(todayOutfit.id, reason);
      await generate({ occasion, weather, regenerate: true });
    },
    [dislike, generate, occasion, todayOutfit, weather],
  );

  /** Bugün için kombini hazır olan ortamlar: geçiş anında olur */
  const readyOccasions = useMemo(
    () =>
      (Object.entries(outfitsByOccasion) as [Occasion, Outfit][])
        .filter(([, outfit]) => outfit?.date === todayKey())
        .map(([key]) => key),
    [outfitsByOccasion],
  );

  return {
    outfit: todayOutfit,
    isForToday,
    weather,
    occasion,
    readyOccasions,
    /** Hangi ortam için hazırlık sürüyor (kutucukta göstergesi çıkar) */
    pendingOccasion,
    generating,
    /** Hava durumu / gardırop / sunucu kontrolü beklenirken true */
    preparing:
      !todayOutfit && (!weatherResolved || !todayChecked || wardrobeStatus === 'loading'),
    error,
    ready,
    hasWardrobe: items.length > 0,
    regenerate,
    changeOccasion,
    like: () => (todayOutfit ? like(todayOutfit.id) : Promise.resolve()),
    dislike: handleDislike,
    markWorn: (note?: string) =>
      todayOutfit ? markWorn(todayOutfit.id, note) : Promise.resolve(),
  };
};
