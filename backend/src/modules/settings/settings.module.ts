import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppSetting } from './entities/app-setting.entity';
import { SettingsService } from './settings.service';

// Controller burada yok: ayar uçları admin modülünde yayınlanır.
// Bu modül yalnızca servisi ve deposunu sağlar.
@Module({
  imports: [TypeOrmModule.forFeature([AppSetting]), ConfigModule],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
