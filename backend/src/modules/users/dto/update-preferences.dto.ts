import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  COLOR_FAMILIES,
  OCCASIONS,
  SEASONS,
  STYLE_TAGS,
} from '../../../common/types/domain.types';
import type {
  ColorFamily,
  Occasion,
  Season,
  StyleTag,
} from '../../../common/types/domain.types';

/**
 * Kısmi güncelleme destekler; gönderilmeyen alanlar mevcut tercihlerden korunur.
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: STYLE_TAGS, isArray: true })
  @IsOptional()
  @ArrayMaxSize(20)
  @IsIn(STYLE_TAGS, { each: true })
  favoriteStyles?: StyleTag[];

  @ApiPropertyOptional({ enum: COLOR_FAMILIES, isArray: true })
  @IsOptional()
  @ArrayMaxSize(20)
  @IsIn(COLOR_FAMILIES, { each: true })
  avoidedColors?: ColorFamily[];

  @ApiPropertyOptional({ enum: ['cold', 'neutral', 'warm'] })
  @IsOptional()
  @IsIn(['cold', 'neutral', 'warm'])
  temperatureSensitivity?: 'cold' | 'neutral' | 'warm';

  @ApiPropertyOptional({ enum: OCCASIONS, isArray: true })
  @IsOptional()
  @ArrayMaxSize(20)
  @IsIn(OCCASIONS, { each: true })
  frequentOccasions?: Occasion[];

  @ApiPropertyOptional({ enum: SEASONS })
  @IsOptional()
  @IsIn(SEASONS)
  preferredSeasonPalette?: Season;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  defaultFormality?: number;
}
