import {
  CLOTHING_CATEGORIES,
  COLOR_FAMILIES,
  MATERIALS,
  PATTERNS,
  SEASONS,
  STYLE_TAGS,
} from '../../../common/types/domain.types';

/**
 * Kıyafet görsel analizi prompt'u.
 * Saf fonksiyon: servis ince kalsın diye tüm metin burada üretilir.
 */

const options = (values: readonly string[]): string => values.join(' | ');

/**
 * Görsel destekli modele gönderilecek tek parça prompt.
 * Model'in yalnızca JSON dönmesi ve sabit listelerin dışına çıkmaması istenir;
 * böylece servis tarafındaki şema doğrulaması nadiren devreye girer.
 */
export function buildClothingAnalysisPrompt(): string {
  return [
    'Sen bir moda kataloglama uzmanısın. Sana verilen fotoğraftaki TEK bir kıyafet parçasını analiz et.',
    '',
    'Kurallar:',
    '- Yanıtın SADECE geçerli bir JSON nesnesi olsun. Açıklama, markdown veya kod bloğu ekleme.',
    '- Alan değerleri aşağıdaki izinli listelerin DIŞINA çıkamaz.',
    '- "name" alanı Türkçe, kısa ve doğal olsun (örn. "Bej triko kazak").',
    '- Renk "hex" değeri fotoğraftaki gerçek tona yakın olmalı ve #RRGGBB biçiminde yazılmalı.',
    '- Emin olmadığın alanlarda en makul tahmini yaz ve "confidence" değerini düşür.',
    '',
    'İzinli değerler:',
    `- category: ${options(CLOTHING_CATEGORIES)}`,
    `- pattern: ${options(PATTERNS)}`,
    `- styles (birden fazla): ${options(STYLE_TAGS)}`,
    `- seasons (birden fazla): ${options(SEASONS)}`,
    `- materials (birden fazla): ${options(MATERIALS)}`,
    `- colors[].family: ${options(COLOR_FAMILIES)}`,
    '- formality: 1 (çok rahat) ile 5 (çok resmî) arası tam sayı',
    '- temperatureRange: parçanın rahat giyilebileceği santigrat aralığı, min < max',
    '- confidence: 0 ile 1 arası ondalık sayı',
    '',
    'Beklenen JSON şeması:',
    '{',
    '  "name": "string",',
    '  "category": "string",',
    '  "subcategory": "string (opsiyonel)",',
    '  "colors": [{ "name": "string", "hex": "#RRGGBB", "family": "string" }],',
    '  "pattern": "string",',
    '  "styles": ["string"],',
    '  "seasons": ["string"],',
    '  "materials": ["string"],',
    '  "formality": 1,',
    '  "temperatureRange": { "min": 0, "max": 0 },',
    '  "confidence": 0.0',
    '}',
  ].join('\n');
}
