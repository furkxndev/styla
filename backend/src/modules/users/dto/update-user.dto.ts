import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import type { Gender } from '../../../common/types/domain.types';

export class UserLocationSettingsDto {
  @ApiPropertyOptional({ example: 'İstanbul' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: 41.0082 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 28.9784 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  useDeviceLocation!: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ayşe Yılmaz' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png', nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1024)
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: ['female', 'male', 'unspecified'] })
  @IsOptional()
  @IsIn(['female', 'male', 'unspecified'])
  gender?: Gender;

  @ApiPropertyOptional({ example: 1998 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  birthYear?: number;

  @ApiPropertyOptional({ type: UserLocationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserLocationSettingsDto)
  location?: UserLocationSettingsDto;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
