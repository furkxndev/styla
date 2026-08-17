import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OCCASIONS, type Occasion } from '../../../common/types/domain.types';
import { WeatherSnapshotDto } from './weather-snapshot.dto';

export class GenerateOutfitDto {
  @ApiPropertyOptional({
    description: 'Kombinin tarihi (YYYY-MM-DD). Boş bırakılırsa bugün alınır.',
    example: '2026-08-17',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date alanı YYYY-MM-DD biçiminde olmalıdır',
  })
  date?: string;

  @ApiProperty({ enum: OCCASIONS, example: 'daily' })
  @IsIn(OCCASIONS, { message: 'Geçersiz ortam (occasion) değeri' })
  occasion: Occasion;

  @ApiPropertyOptional({
    type: WeatherSnapshotDto,
    description:
      'İstemci hava durumunu zaten çektiyse gönderir; gönderilmezse backend kendisi çeker.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WeatherSnapshotDto)
  weather?: WeatherSnapshotDto;

  @ApiPropertyOptional({
    description: 'Bu kombinlerdeki parçalardan kaçınılsın (yeniden öneri).',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, {
    each: true,
    message: 'excludeOutfitIds geçerli uuid olmalıdır',
  })
  excludeOutfitIds?: string[];

  @ApiPropertyOptional({
    description: 'Kullanıcının kombinde kalmasını istediği parçalar.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, {
    each: true,
    message: 'pinnedItemIds geçerli uuid olmalıdır',
  })
  pinnedItemIds?: string[];

  @ApiPropertyOptional({
    description:
      'Kullanıcı açıkça yeni/farklı bir kombin istedi. true ise aynı güne ait mevcut önerinin parçalarından mümkün olduğunca kaçınılır.',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'regenerate alanı true/false olmalıdır' })
  regenerate?: boolean;

  @ApiPropertyOptional({ maxLength: 300, example: 'Bugün çok yürüyeceğim' })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Not en fazla 300 karakter olabilir' })
  notes?: string;
}
