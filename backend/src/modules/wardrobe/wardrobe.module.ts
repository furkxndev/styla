import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { ClothingItem } from './entities/clothing-item.entity';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeService } from './wardrobe.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClothingItem]), AiModule, StorageModule],
  providers: [WardrobeService],
  controllers: [WardrobeController],
  // Outfits ve Assistant modülleri gardırop erişimi için bunları kullanır.
  exports: [WardrobeService, TypeOrmModule],
})
export class WardrobeModule {}
