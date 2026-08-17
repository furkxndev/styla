import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Outfit } from '../outfits/entities/outfit.entity';
import { OutfitsModule } from '../outfits/outfits.module';
import { User } from '../users/entities/user.entity';
import { DailyOutfitService } from './daily-outfit.service';
import { PushService } from './push.service';

/**
 * Zamanlanmış işler. Şimdilik tek iş var: kullanıcının seçtiği saatte
 * günün kombinini hazırlamak ve bildirim göndermek.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Outfit]),
    OutfitsModule,
  ],
  providers: [DailyOutfitService, PushService],
  exports: [PushService, DailyOutfitService],
})
export class SchedulerModule {}
