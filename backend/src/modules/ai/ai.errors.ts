import {
  BadGatewayException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * AI katmanına özgü hatalar.
 *
 * Mesajlar kullanıcıya gösterilebilir olduğu için Türkçe ve teknik detaydan
 * arındırılmıştır. API anahtarı gibi gizli veriler buraya asla girmemelidir.
 */

/** Sağlayıcıya hiç ulaşılamadı / zaman aşımı / tekrar denemeler tükendi */
export class AiProviderUnavailableException extends ServiceUnavailableException {
  constructor(detail?: string) {
    super(
      detail
        ? `Yapay zeka servisine şu anda ulaşılamıyor (${detail}). Lütfen biraz sonra tekrar deneyin.`
        : 'Yapay zeka servisine şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.',
    );
  }
}

/** Sağlayıcı yanıt verdi ama içerik beklenen JSON şemasına uymuyor */
export class AiResponseFormatException extends BadGatewayException {
  constructor(detail: string) {
    super(`Yapay zeka beklenen formatta yanıt üretemedi: ${detail}`);
  }
}

/** Yanlış/eksik yapılandırma — kullanıcı hatası değil, operasyonel hata */
export class AiConfigurationException extends InternalServerErrorException {
  constructor(detail: string) {
    super(`Yapay zeka yapılandırması eksik: ${detail}`);
  }
}
