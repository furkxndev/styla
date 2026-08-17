import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WearOutfitDto {
  @ApiPropertyOptional({ maxLength: 500, example: 'Gün boyu çok rahattı' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Not en fazla 500 karakter olabilir' })
  note?: string;
}
