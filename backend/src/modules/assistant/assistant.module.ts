import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { OutfitsModule } from '../outfits/outfits.module';
import { UsersModule } from '../users/users.module';
import { WardrobeModule } from '../wardrobe/wardrobe.module';
import { WeatherModule } from '../weather/weather.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { ChatMessage } from './entities/chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    WardrobeModule,
    WeatherModule,
    AiModule,
    UsersModule,
    OutfitsModule,
  ],
  providers: [AssistantService],
  controllers: [AssistantController],
  exports: [AssistantService],
})
export class AssistantModule {}
