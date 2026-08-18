import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserResponse, WardrobeStats } from '../../common/types/domain.types';
import { PushTokenDto } from './dto/push-token.dto';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { toUserResponse } from './mappers/user.mapper';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Profil bilgilerini günceller' })
  async updateMe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    return toUserResponse(await this.usersService.update(userId, dto));
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Stil tercihlerini günceller' })
  async updatePreferences(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserResponse> {
    return toUserResponse(await this.usersService.updatePreferences(userId, dto));
  }

  @Patch('me/notifications')
  @ApiOperation({ summary: 'Bildirim ayarlarını günceller' })
  async updateNotifications(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateNotificationsDto,
  ): Promise<UserResponse> {
    return toUserResponse(await this.usersService.updateNotifications(userId, dto));
  }

  @Post('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cihazın push token bilgisini kaydeder' })
  async setPushToken(
    @CurrentUser('userId') userId: string,
    @Body() dto: PushTokenDto,
  ): Promise<void> {
    await this.usersService.updatePushToken(userId, dto.token, dto.timezone);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Gardırop ve kombin istatistiklerini döner' })
  async getStats(@CurrentUser('userId') userId: string): Promise<WardrobeStats> {
    return this.usersService.getStats(userId);
  }
}
