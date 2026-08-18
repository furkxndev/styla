import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Kısmi güncelleme destekler; gönderilmeyen alanlar mevcut ayarlardan korunur.
 */
export class UpdateNotificationsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  dailyOutfitEnabled?: boolean;

  @ApiPropertyOptional({ example: '08:00', description: 'HH:mm formatında' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'dailyOutfitTime HH:mm formatında olmalı',
  })
  dailyOutfitTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  weatherAlertsEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  wearReminderEnabled?: boolean;

  @ApiPropertyOptional({ example: 'ExponentPushToken[xxx]', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pushToken?: string;

  @ApiPropertyOptional({ example: 'Europe/Istanbul', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
