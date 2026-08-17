import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SettingsModule } from '../settings/settings.module';
import { AiUsageService } from './ai-usage.service';
import { AiConfigurationException } from './ai.errors';
import { AiService } from './ai.service';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';
import { OpenRouterProvider } from './providers/openrouter.provider';

/**
 * AI modülü.
 *
 * Sağlayıcı seçimi tek bir factory içinde toplandı: yeni bir sağlayıcı eklemek
 * için AiProvider'ı uygulayan sınıfı yazıp aşağıdaki switch'e tek bir case
 * eklemek yeterli. Modülün geri kalanı ve diğer modüller değişmez.
 *
 * AI_PROVIDER dışa açılır; admin modülü model listesi ve hesap kullanımı için
 * doğrudan sağlayıcıya sorar.
 */
@Module({
  imports: [
    ConfigModule,
    SettingsModule,
    TypeOrmModule.forFeature([AiUsageLog]),
  ],
  providers: [
    AiService,
    AiUsageService,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('ai.provider') ?? 'openrouter';
        switch (provider) {
          case 'openrouter':
            return new OpenRouterProvider(config);
          default:
            throw new AiConfigurationException(
              `bilinmeyen AI sağlayıcısı "${provider}"`,
            );
        }
      },
    },
  ],
  exports: [AiService, AiUsageService, AI_PROVIDER],
})
export class AiModule {}
