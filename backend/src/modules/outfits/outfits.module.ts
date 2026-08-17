import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutfitsService } from './outfits.service';
import { OutfitsController } from './outfits.controller';
import { Outfit } from './entities/outfit.entity';
import { OutfitItem } from './entities/outfit-item.entity';
import { User } from '../users/entities/user.entity';
import { WardrobeModule } from '../wardrobe/wardrobe.module';
import { WeatherModule } from '../weather/weather.module';
import { AiModule } from '../ai/ai.module';

@Module({
  // User repository'si yalnızca tercih/konum okumak için kullanılır (UsersModule'e bağımlılık yok)
  imports: [
    TypeOrmModule.forFeature([Outfit, OutfitItem, User]),
    WardrobeModule,
    WeatherModule,
    AiModule,
  ],
  providers: [OutfitsService],
  controllers: [OutfitsController],
  exports: [OutfitsService, TypeOrmModule],
})
export class OutfitsModule {}
