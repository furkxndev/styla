import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClothingItem } from '../wardrobe/entities/clothing-item.entity';
import { Outfit } from '../outfits/entities/outfit.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// İstatistikler için gardırop/kombin repository'lerine salt-okunur erişim gerekir.
@Module({
  imports: [TypeOrmModule.forFeature([User, ClothingItem, Outfit])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
