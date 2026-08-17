import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { OutfitsModule } from './modules/outfits/outfits.module';
import { StorageModule } from './modules/storage/storage.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { WardrobeModule } from './modules/wardrobe/wardrobe.module';
import { WeatherModule } from './modules/weather/weather.module';


@Module({
  imports: [
    // Ortam değişkenleri uygulama açılışında doğrulanır; eksikse uygulama başlamaz.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env'],
      cache: true,
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttlMs') ?? 60000,
            limit: config.get<number>('throttle.limit') ?? 120,
          },
        ],
      }),
    }),

    DatabaseModule,

    // Altyapı modülleri
    SettingsModule,
    AiModule,
    StorageModule,

    // Domain modülleri
    UsersModule,
    AuthModule,
    WardrobeModule,
    WeatherModule,
    OutfitsModule,
    AssistantModule,
    AdminModule,
    SchedulerModule,
    HealthModule,
  ],
  providers: [
    // Sıra önemlidir: önce kimlik doğrulanır, sonra rol/aktiflik kontrol edilir.
    // Tüm endpoint'ler varsayılan olarak korumalıdır; istisnalar @Public() ile işaretlenir.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
