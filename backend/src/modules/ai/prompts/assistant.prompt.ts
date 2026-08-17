import { OUTFIT_SLOT_ROLES } from '../../../common/types/domain.types';
import type { AssistantQuestionInput } from '../interfaces/ai.types';

/**
 * Stil asistanı prompt'ları.
 * Asistan da kombin önerebildiği için outfit ile aynı slot/score şemasını kullanır.
 */

const SUGGESTED_OUTFIT_SCHEMA = [
  '{',
  '  "message": "string",',
  '  "referencedItemIds": ["string"],',
  '  "suggestedOutfit": null,',
  '  // veya suggestedOutfit yerine:',
  '  // { "slots": [{ "role": "string", "itemId": "string", "reason": "string" }],',
  '  //   "summary": "string", "stylingTip": "string",',
  '  //   "score": { "colorHarmony": 0, "styleCoherence": 0, "weatherFit": 0, "personalPreference": 0, "overall": 0 } }',
  '}',
].join('\n');

export function buildAssistantSystemPrompt(): string {
  return [
    'Sen Kombin uygulamasının kişisel stil asistanısın. Kullanıcıyla samimi, kısa ve net konuşursun.',
    '',
    'Kurallar:',
    '- Yanıtın SADECE geçerli bir JSON nesnesi olsun. Açıklama, markdown veya kod bloğu ekleme.',
    '- "message" alanı TÜRKÇE, sohbet dilinde ve gereksiz uzunlukta olmasın.',
    '- Cevabında kullanıcının gerçek parçalarına atıf yap ve o parçaların id\'lerini "referencedItemIds" içine koy.',
    '- itemId değerleri YALNIZCA sana verilen gardırop listesinden seçilebilir; id UYDURMA.',
    '- Kullanıcı somut bir kombin isterse "suggestedOutfit" alanını doldur; istemiyorsa null bırak.',
    `- suggestedOutfit.slots[].role şunlardan biri olmalı: ${OUTFIT_SLOT_ROLES.join(' | ')}`,
    '- suggestedOutfit.score değerlerini sen belirlersin: 0-100 arası tam sayı.',
    '- Gardırop bir soruya cevap vermek için yetersizse bunu dürüstçe söyle ve ne eksik olduğunu belirt.',
    '',
    'Beklenen JSON şeması:',
    SUGGESTED_OUTFIT_SCHEMA,
  ].join('\n');
}

/** Soruyu ve gardırop bağlamını modele veren mesaj */
export function buildAssistantUserPrompt(
  input: AssistantQuestionInput,
): string {
  const context = {
    weather: input.weather ?? null,
    preferences: input.preferences ?? null,
    focusItemId: input.focusItemId ?? null,
    wardrobe: input.wardrobe,
  };

  return [
    'BAĞLAM (JSON):',
    JSON.stringify(context),
    '',
    input.focusItemId
      ? 'Kullanıcı focusItemId ile belirtilen parça hakkında konuşuyor; cevabını buna odakla.'
      : '',
    'KULLANICININ SORUSU:',
    input.question,
    '',
    'Sadece JSON döndür.',
  ]
    .filter(Boolean)
    .join('\n');
}
