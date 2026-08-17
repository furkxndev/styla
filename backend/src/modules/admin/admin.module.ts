import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { ChatMessage } from '../assistant/entities/chat-message.entity';
import { Outfit } from '../outfits/entities/outfit.entity';
import { SettingsModule } from '../settings/settings.module';
import { User } from '../users/entities/user.entity';
import { ClothingItem } from '../wardrobe/entities/clothing-item.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SchedulerModule } from '../scheduler/scheduler.module';

/**
 * Yönetim modülü.
 *
 * Sayım sorguları doğrudan repository üzerinden yapıldığı için diğer domain
 * servisleri (WardrobeService, OutfitsService) içe alınmaz; onlar kullanıcıya
 * kısıtlı çalışır, buradaki sorgular ise sistem geneli.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, ClothingItem, Outfit, ChatMessage]),
    AiModule,
    SettingsModule,
    SchedulerModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
