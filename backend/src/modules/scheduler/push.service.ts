import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Expo Push servisi.
 *
 * Not: Expo Go içinde uzaktan bildirim desteklenmez (SDK 53+); bu yüzden token
 * yalnızca development/production build'lerde oluşur. Token yoksa sessizce
 * atlanır — uygulama ayrıca cihazda yerel bildirim de planlar.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: PushMessage): Promise<void> {
    const url = this.config.get<string>('push.expoUrl') ?? 'https://exp.host/--/api/v2/push/send';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: message.token,
          title: message.title,
          body: message.body,
          data: message.data ?? {},
          sound: 'default',
          priority: 'high',
          channelId: 'daily-outfit',
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Push gönderilemedi (HTTP ${response.status})`);
        return;
      }

      const result = (await response.json()) as {
        data?: { status?: string; message?: string };
      };
      if (result.data?.status === 'error') {
        this.logger.warn(`Push reddedildi: ${result.data.message ?? 'bilinmeyen sebep'}`);
      }
    } catch (error) {
      // Bildirim gönderilememesi kombin üretimini geçersiz kılmaz
      this.logger.warn(
        `Push servisine ulaşılamadı: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`,
      );
    }
  }
}
