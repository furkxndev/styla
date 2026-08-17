import { config } from '../../constants/config';
import type {
  GenerateOutfitRequest,
  Occasion,
  Outfit,
  OutfitFeedbackPayload,
} from '../../types/outfit';
import { todayKey } from '../../utils/date';
import { mockOutfits } from '../mock/mockServer';
import { apiClient } from './client';
import { ENDPOINTS } from './endpoints';

export const outfitApi = {
  generate: (payload: GenerateOutfitRequest): Promise<Outfit> =>
    config.useMockApi
      ? mockOutfits.generate(payload)
      : apiClient.post<Outfit>(ENDPOINTS.outfits.generate, payload, {
          timeoutMs: config.aiRequestTimeoutMs,
        }),

  /**
   * Cihazın yerel günü sunucununkinden farklı olabilir (saat dilimi),
   * bu yüzden "bugün" bilgisi istemciden gönderilir.
   *
   * `occasion` verilirse yalnızca o ortamın kombini döner: ortam değiştirilirken
   * hazır kombin varsa AI çağrısı yapılmadan getirilir.
   */
  today: (occasion?: Occasion): Promise<Outfit | null> =>
    config.useMockApi
      ? mockOutfits.today(occasion)
      : apiClient.get<Outfit | null>(ENDPOINTS.outfits.today, {
          query: { date: todayKey(), occasion },
        }),

  list: (): Promise<Outfit[]> =>
    config.useMockApi
      ? mockOutfits.list()
      : apiClient.get<Outfit[]>(ENDPOINTS.outfits.list),

  sendFeedback: (payload: OutfitFeedbackPayload): Promise<Outfit> =>
    config.useMockApi
      ? mockOutfits.feedback(payload)
      : apiClient.post<Outfit>(ENDPOINTS.outfits.feedback(payload.outfitId), {
          feedback: payload.feedback,
          reason: payload.reason,
        }),

  markWorn: (outfitId: string, note?: string): Promise<Outfit> =>
    config.useMockApi
      ? mockOutfits.markWorn(outfitId, note)
      : apiClient.post<Outfit>(ENDPOINTS.outfits.wear(outfitId), { note }),

  remove: (outfitId: string): Promise<void> =>
    config.useMockApi
      ? mockOutfits.remove(outfitId)
      : apiClient.delete<void>(ENDPOINTS.outfits.remove(outfitId)),
};
