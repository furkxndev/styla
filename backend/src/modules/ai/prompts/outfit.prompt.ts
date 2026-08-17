import { OUTFIT_SLOT_ROLES } from '../../../common/types/domain.types';
import type { OutfitGenerationInput } from '../interfaces/ai.types';

/**
 * Kombin üretim prompt'ları.
 *
 * Kombin kararının TAMAMI modele aittir: burada hiçbir puanlama, renk uyumu ya da
 * mevsim eşleştirme hesabı yapılmaz; gardırop ve bağlam olduğu gibi modele verilir.
 */

const OUTFIT_JSON_SCHEMA = [
  '{',
  '  "slots": [{ "role": "string", "itemId": "string", "reason": "string" }],',
  '  "summary": "string",',
  '  "stylingTip": "string",',
  '  "score": {',
  '    "colorHarmony": 0,',
  '    "styleCoherence": 0,',
  '    "weatherFit": 0,',
  '    "personalPreference": 0,',
  '    "overall": 0',
  '  }',
  '}',
].join('\n');

export function buildOutfitSystemPrompt(): string {
  return [
    'Sen kişisel bir stil danışmanısın. Kullanıcının kendi gardırobundaki parçalardan günlük bir kombin hazırlıyorsun.',
    '',
    'Kurallar:',
    '- Yanıtın SADECE geçerli bir JSON nesnesi olsun. Açıklama, markdown veya kod bloğu ekleme.',
    '- "itemId" değerleri YALNIZCA sana verilen gardırop listesindeki id\'lerden seçilebilir. Listede olmayan bir id UYDURMA.',
    "- Aynı parçayı birden fazla slot'ta kullanma.",
    `- "role" değeri şunlardan biri olmalı: ${OUTFIT_SLOT_ROLES.join(' | ')}`,
    '- Elbise seçtiysen ayrıca üst/alt ekleme; elbise seçmediysen en az bir üst ve bir alt olsun. Ayakkabı neredeyse her zaman gerekir.',
    '- Hava durumu, tercih ve geri bildirim geçmişini dikkate al; kullanıcının sevmediği kombinasyonları tekrar etme.',
    '- "summary", "stylingTip" ve her slot\'un "reason" alanı TÜRKÇE, kısa, doğal ve samimi olsun. Kalıplaşmış cümle kurma.',
    '- "score" alanındaki tüm değerleri sen belirlersin: 0-100 arası tam sayı. Kombin ne kadar iyiyse o kadar yüksek.',
    '',
    'Beklenen JSON şeması:',
    OUTFIT_JSON_SCHEMA,
  ].join('\n');
}

/** Modelin göreceği bağlam: gardırop + hava + tercihler + geri bildirim */
export function buildOutfitUserPrompt(input: OutfitGenerationInput): string {
  const context = {
    date: input.date,
    occasion: input.occasion,
    weather: input.weather ?? null,
    preferences: input.preferences ?? null,
    feedbackHistory: input.feedbackHistory ?? [],
    pinnedItemIds: input.pinnedItemIds ?? [],
    excludeItemIds: input.excludeItemIds ?? [],
    avoidRepeatItemIds: input.avoidRepeatItemIds ?? [],
    notes: input.notes ?? null,
    wardrobe: input.wardrobe,
  };

  return [
    'Aşağıdaki bağlama göre bir kombin öner.',
    '',
    'BAĞLAM (JSON):',
    JSON.stringify(context),
    '',
    input.pinnedItemIds && input.pinnedItemIds.length > 0
      ? 'pinnedItemIds içindeki parçaları kombinde MUTLAKA kullan.'
      : '',
    input.excludeItemIds && input.excludeItemIds.length > 0
      ? [
          'excludeItemIds içindeki parçaları bu kombinde KULLANMA.',
          'Tek istisna: o kategoride gardıropta başka hiçbir seçenek yoksa parçayı kullanabilirsin (kombin kurulamamasındansa kullanmak yeğdir).',
        ].join('\n')
      : '',
    // Aynı gün için tekrar öneri istendiğinde model kendi "en iyi" seçimini
    // tekrarlamaya çok yatkın; farklılığı açıkça istemek gerekiyor.
    input.avoidRepeatItemIds && input.avoidRepeatItemIds.length > 0
      ? [
          'ÖNEMLİ — kullanıcı bu gün için YENİ bir öneri istedi:',
          '- avoidRepeatItemIds listesindeki parçalar en son önerilen kombindeydi.',
          '- Alternatifi bulunan her slot için bu listeden FARKLI bir parça seç.',
          '- Bir kategoride gardıropta tek seçenek varsa (ör. tek pantolon) onu tekrar kullanabilirsin; ama kombinin geri kalanını belirgin biçimde değiştir.',
          '- Önceki öneriyle birebir aynı parça listesini döndürme.',
          '- "summary" ve "stylingTip" metinlerini de bu yeni kombine göre yeniden yaz.',
        ].join('\n')
      : '',
    'Sadece JSON döndür.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Şema dışı yanıt geldiğinde tek seferlik düzeltme isteği */
export function buildOutfitRepairPrompt(errors: string[]): string {
  return [
    'Önceki yanıtın beklenen şemaya uymuyor. Tespit edilen sorunlar:',
    ...errors.map((error) => `- ${error}`),
    '',
    'Aynı bağlamı kullanarak yanıtı düzelt ve SADECE geçerli JSON döndür.',
    'Unutma: itemId değerleri yalnızca verilen gardırop listesinden seçilebilir.',
  ].join('\n');
}
