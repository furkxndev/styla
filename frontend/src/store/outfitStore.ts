import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { outfitApi } from '../services/api';
import { storage } from '../services/storage';
import { ApiError, type AsyncStatus } from '../types/api';
import type {
  DislikeReason,
  GenerateOutfitRequest,
  Occasion,
  Outfit,
} from '../types/outfit';
import type { WeatherSnapshot } from '../types/weather';
import { todayKey } from '../utils/date';
import { deriveLearnedPreferences, type LearnedPreferences } from '../utils/styleRules';

interface OutfitState {
  todayOutfit: Outfit | null;
  history: Outfit[];
  status: AsyncStatus;
  /** Kombin üretiliyor (AI bekleniyor) */
  generating: boolean;
  error: string | null;
  selectedOccasion: Occasion;
  /**
   * Bugün için ortam başına üretilmiş kombinler.
   * Ortam değiştirildiğinde daha önce üretilmiş kombin varsa yeniden
   * üretilmez — geçiş anında olur.
   */
  outfitsByOccasion: Partial<Record<Occasion, Outfit>>;
  /** Hangi ortam için kombin hazırlanıyor (kartta o kutucuk yükleniyor gösterir) */
  pendingOccasion: Occasion | null;
  /** Kullanıcının reddettiği kombinler — yeni öneri istenince hariç tutulur */
  rejectedOutfitIds: string[];
  /** Bugünün kombini sunucudan sorulup sonuçlandı mı (üretimden önce beklenir) */
  todayChecked: boolean;

  fetchToday: () => Promise<void>;
  /**
   * Ortam değiştirir. Sırayla: yerel önbellek → sunucudaki hazır kombin → üretim.
   * Yalnızca gerçekten kombin yoksa AI çağrısı yapılır.
   */
  selectOccasion: (occasion: Occasion, weather?: WeatherSnapshot | null) => Promise<void>;
  /**
   * Günün kombinini garanti eder: yoksa GÜNDE BİR KEZ üretir.
   * Uygulamayı yenilemek yeni kombin üretmez.
   */
  ensureTodayOutfit: (params: {
    occasion?: Occasion;
    weather?: WeatherSnapshot | null;
  }) => Promise<void>;
  fetchHistory: (options?: { silent?: boolean }) => Promise<void>;
  generate: (params: {
    occasion?: Occasion;
    weather?: WeatherSnapshot | null;
    pinnedItemIds?: string[];
    regenerate?: boolean;
  }) => Promise<Outfit | null>;
  setOccasion: (occasion: Occasion) => void;
  like: (outfitId: string) => Promise<void>;
  dislike: (outfitId: string, reason?: DislikeReason) => Promise<void>;
  markWorn: (outfitId: string, note?: string) => Promise<void>;
  removeOutfit: (outfitId: string) => Promise<void>;
  getLearnedPreferences: () => LearnedPreferences;
  clearError: () => void;
  reset: () => void;
}

const upsert = (list: Outfit[], outfit: Outfit) => {
  const exists = list.some((item) => item.id === outfit.id);
  return exists
    ? list.map((item) => (item.id === outfit.id ? outfit : item))
    : [outfit, ...list];
};

type OccasionCache = Partial<Record<Occasion, Outfit>>;

/** Önbelleğe yaz; yalnızca bugüne ait kombinler tutulur */
const cacheOutfit = (cache: OccasionCache, outfit: Outfit): OccasionCache =>
  outfit.date === todayKey() ? { ...cache, [outfit.occasion]: outfit } : cache;

/** Silinen/beğenilmeyen kombini önbellekten düşür */
const uncacheOutfit = (cache: OccasionCache, outfitId: string): OccasionCache => {
  const next: OccasionCache = {};
  for (const [occasion, outfit] of Object.entries(cache) as [Occasion, Outfit][]) {
    if (outfit && outfit.id !== outfitId) next[occasion] = outfit;
  }
  return next;
};

export const useOutfitStore = create<OutfitState>((set, get) => ({
  todayOutfit: null,
  history: [],
  status: 'idle',
  generating: false,
  error: null,
  selectedOccasion: 'daily',
  outfitsByOccasion: {},
  pendingOccasion: null,
  rejectedOutfitIds: [],
  todayChecked: false,

  async fetchToday() {
    try {
      const outfit = await outfitApi.today();
      // Seçili ortam da kombine göre hizalanır: aksi halde "Günlük" seçili
      // görünürken ekranda "Spor" kombini durabiliyordu.
      set({
        todayOutfit: outfit,
        selectedOccasion: outfit?.occasion ?? get().selectedOccasion,
        outfitsByOccasion: outfit
          ? cacheOutfit(get().outfitsByOccasion, outfit)
          : get().outfitsByOccasion,
      });
    } catch {
      // Sessiz geç: ana sayfa üretim akışına düşer
    } finally {
      // Sorgu sonuçlanmadan otomatik üretim tetiklenmemeli
      set({ todayChecked: true });
    }
  },

  async selectOccasion(occasion, weather) {
    if (get().pendingOccasion) return;
    set({ selectedOccasion: occasion, error: null });

    // 1) Yerel önbellek: aynı oturumda üretilmiş kombin anında gösterilir
    const cached = get().outfitsByOccasion[occasion];
    if (cached && cached.date === todayKey()) {
      set({ todayOutfit: cached });
      return;
    }

    // 2) Sunucu: uygulama yeniden başlatıldıysa önbellek boş olur ama
    //    kombin veritabanında hazır durabilir (AI çağrısı gerekmez)
    set({ pendingOccasion: occasion });
    try {
      const existing = await outfitApi.today(occasion);
      if (existing) {
        set({
          todayOutfit: existing,
          outfitsByOccasion: cacheOutfit(get().outfitsByOccasion, existing),
          pendingOccasion: null,
        });
        return;
      }
    } catch {
      // Sunucuya ulaşılamadıysa üretim akışına düş
    }
    set({ pendingOccasion: null });

    // 3) Gerçekten kombin yok: ilk kez üretilir
    await get().generate({ occasion, weather });
  },

  async ensureTodayOutfit({ occasion, weather }) {
    const today = todayKey();
    const current = get().todayOutfit;

    // Bugüne ait kombin zaten var
    if (current && current.date === today) return;
    if (get().generating) return;

    // Aynı gün içinde ikinci kez otomatik üretim yapılmaz. Kullanıcı yeni
    // kombin isterse "Yeni kombin" düğmesini kullanır; böylece uygulamayı
    // her açtığında AI çağrısı yapılmaz (maliyet + geçmiş kirliliği).
    const lastAutoDate = await storage.get<string>(STORAGE_KEYS.lastAutoOutfitDate);
    if (lastAutoDate === today) return;

    await storage.set(STORAGE_KEYS.lastAutoOutfitDate, today);
    await get().generate({ occasion, weather });
  },

  async fetchHistory(options) {
    if (!options?.silent) set({ status: 'loading', error: null });
    try {
      const history = await outfitApi.list();
      set({ history, status: 'success' });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof ApiError ? error.message : 'Kombin geçmişi yüklenemedi.',
      });
    }
  },

  async generate({ occasion, weather, pinnedItemIds, regenerate }) {
    const targetOccasion = occasion ?? get().selectedOccasion;
    set({
      generating: true,
      error: null,
      selectedOccasion: targetOccasion,
      pendingOccasion: targetOccasion,
    });

    const rejected = get().rejectedOutfitIds;
    const payload: GenerateOutfitRequest = {
      date: todayKey(),
      occasion: targetOccasion,
      weather: weather ?? undefined,
      // Beğenilmeyen kombinler her üretimde hariç tutulur, sadece "yeni kombin"de değil
      excludeOutfitIds: rejected.length > 0 ? rejected : undefined,
      // Backend'e "farklı bir şey öner" sinyali: bu olmadan AI aynı kombini tekrarlıyor
      regenerate: regenerate || undefined,
      pinnedItemIds,
    };

    try {
      const outfit = await outfitApi.generate(payload);
      set({
        todayOutfit: outfit,
        outfitsByOccasion: cacheOutfit(get().outfitsByOccasion, outfit),
        history: upsert(get().history, outfit),
        generating: false,
        pendingOccasion: null,
      });
      return outfit;
    } catch (error) {
      set({
        generating: false,
        pendingOccasion: null,
        error:
          error instanceof ApiError
            ? error.message
            : 'Kombin oluşturulamadı. Lütfen tekrar dene.',
      });
      return null;
    }
  },

  setOccasion(occasion) {
    set({ selectedOccasion: occasion });
  },

  async like(outfitId) {
    const apply = (outfit: Outfit) => ({ ...outfit, feedback: 'liked' as const });
    set({
      todayOutfit:
        get().todayOutfit?.id === outfitId ? apply(get().todayOutfit!) : get().todayOutfit,
      history: get().history.map((o) => (o.id === outfitId ? apply(o) : o)),
    });
    try {
      const updated = await outfitApi.sendFeedback({ outfitId, feedback: 'liked' });
      set({
        history: get().history.map((o) => (o.id === outfitId ? updated : o)),
        todayOutfit: get().todayOutfit?.id === outfitId ? updated : get().todayOutfit,
        outfitsByOccasion: cacheOutfit(get().outfitsByOccasion, updated),
      });
    } catch {
      set({ error: 'Geri bildirim kaydedilemedi.' });
    }
  },

  async dislike(outfitId, reason) {
    set({ rejectedOutfitIds: [...get().rejectedOutfitIds, outfitId] });
    try {
      const updated = await outfitApi.sendFeedback({
        outfitId,
        feedback: 'disliked',
        reason,
      });
      set({
        history: get().history.map((o) => (o.id === outfitId ? updated : o)),
        todayOutfit: get().todayOutfit?.id === outfitId ? null : get().todayOutfit,
        // Beğenilmeyen kombin önbellekte kalmasın; ortama dönülünce yenisi üretilir
        outfitsByOccasion: uncacheOutfit(get().outfitsByOccasion, outfitId),
      });
    } catch {
      set({ error: 'Geri bildirim kaydedilemedi.' });
    }
  },

  async markWorn(outfitId, note) {
    try {
      const updated = await outfitApi.markWorn(outfitId, note);
      set({
        history: upsert(get().history, updated),
        todayOutfit: get().todayOutfit?.id === outfitId ? updated : get().todayOutfit,
        outfitsByOccasion: cacheOutfit(get().outfitsByOccasion, updated),
      });
    } catch (error) {
      set({
        error: error instanceof ApiError ? error.message : 'Kombin kaydedilemedi.',
      });
    }
  },

  async removeOutfit(outfitId) {
    const previous = get().history;
    set({
      history: previous.filter((o) => o.id !== outfitId),
      todayOutfit: get().todayOutfit?.id === outfitId ? null : get().todayOutfit,
      outfitsByOccasion: uncacheOutfit(get().outfitsByOccasion, outfitId),
    });
    try {
      await outfitApi.remove(outfitId);
    } catch {
      set({ history: previous, error: 'Kombin silinemedi.' });
    }
  },

  getLearnedPreferences() {
    return deriveLearnedPreferences(get().history);
  },

  clearError() {
    set({ error: null });
  },

  reset() {
    set({
      todayOutfit: null,
      history: [],
      status: 'idle',
      generating: false,
      error: null,
      outfitsByOccasion: {},
      pendingOccasion: null,
      rejectedOutfitIds: [],
      todayChecked: false,
    });
  },
}));
