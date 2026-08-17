import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CLOTHING_CATEGORIES,
  MATERIALS,
  PATTERNS,
  SEASONS,
  STYLE_TAGS,
  type ClothingCategory,
  type Material,
  type Pattern,
  type Season,
  type StyleTag,
} from '../../../common/types/domain.types';
import { ClothingColorDto } from './clothing-color.dto';

export class TemperatureRangeDto {
  @ApiProperty({ example: 8, description: 'Uygun en düşük sıcaklık (°C)' })
  @IsNumber({}, { message: 'En düşük sıcaklık sayı olmalı.' })
  min!: number;

  @ApiProperty({ example: 22, description: 'Uygun en yüksek sıcaklık (°C)' })
  @IsNumber({}, { message: 'En yüksek sıcaklık sayı olmalı.' })
  max!: number;
}

export class CreateClothingItemDto {
  @ApiProperty({ example: 'Lacivert oxford gömlek' })
  @IsString({ message: 'İsim metin olmalı.' })
  @MinLength(1, { message: 'İsim boş olamaz.' })
  @MaxLength(120, { message: 'İsim en fazla 120 karakter olabilir.' })
  name!: string;

  @ApiProperty({ enum: CLOTHING_CATEGORIES, example: 'top' })
  @IsIn(CLOTHING_CATEGORIES, { message: 'Geçersiz kategori.' })
  category!: ClothingCategory;

  @ApiPropertyOptional({ example: 'gömlek' })
  @IsOptional()
  @IsString({ message: 'Alt kategori metin olmalı.' })
  @MaxLength(64, { message: 'Alt kategori çok uzun.' })
  subcategory?: string;

  @ApiProperty({ example: 'https://cdn.kombin.app/uploads/abc.jpg' })
  @IsString({ message: 'Görsel adresi metin olmalı.' })
  @MinLength(1, { message: 'Görsel adresi boş olamaz.' })
  imageUrl!: string;

  @ApiPropertyOptional({ example: 'https://cdn.kombin.app/uploads/abc-thumb.jpg' })
  @IsOptional()
  @IsString({ message: 'Küçük görsel adresi metin olmalı.' })
  thumbnailUrl?: string;

  @ApiProperty({ type: [ClothingColorDto] })
  @IsArray({ message: 'Renkler dizi olmalı.' })
  @ArrayMinSize(1, { message: 'En az bir renk gerekli.' })
  @ValidateNested({ each: true })
  @Type(() => ClothingColorDto)
  colors!: ClothingColorDto[];

  @ApiProperty({ enum: PATTERNS, example: 'solid' })
  @IsIn(PATTERNS, { message: 'Geçersiz desen.' })
  pattern!: Pattern;

  @ApiProperty({ enum: STYLE_TAGS, isArray: true, example: ['smart_casual'] })
  @IsArray({ message: 'Stiller dizi olmalı.' })
  @IsIn(STYLE_TAGS, { each: true, message: 'Geçersiz stil etiketi.' })
  styles!: StyleTag[];

  @ApiProperty({ enum: SEASONS, isArray: true, example: ['spring', 'autumn'] })
  @IsArray({ message: 'Mevsimler dizi olmalı.' })
  @IsIn(SEASONS, { each: true, message: 'Geçersiz mevsim.' })
  seasons!: Season[];

  @ApiPropertyOptional({ enum: MATERIALS, isArray: true, example: ['cotton'] })
  @IsOptional()
  @IsArray({ message: 'Kumaşlar dizi olmalı.' })
  @IsIn(MATERIALS, { each: true, message: 'Geçersiz kumaş türü.' })
  materials?: Material[];

  @ApiProperty({ minimum: 1, maximum: 5, example: 3 })
  @IsInt({ message: 'Formalite tam sayı olmalı.' })
  @Min(1, { message: 'Formalite en az 1 olmalı.' })
  @Max(5, { message: 'Formalite en fazla 5 olabilir.' })
  formality!: number;

  @ApiProperty({ type: TemperatureRangeDto })
  @ValidateNested()
  @Type(() => TemperatureRangeDto)
  temperatureRange!: TemperatureRangeDto;

  @ApiPropertyOptional({ example: 'Mavi Marine' })
  @IsOptional()
  @IsString({ message: 'Marka metin olmalı.' })
  @MaxLength(80, { message: 'Marka adı çok uzun.' })
  brand?: string;

  @ApiPropertyOptional({ example: 'Kolları biraz uzun.' })
  @IsOptional()
  @IsString({ message: 'Not metin olmalı.' })
  @MaxLength(500, { message: 'Not en fazla 500 karakter olabilir.' })
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: 'Favori alanı boolean olmalı.' })
  isFavorite?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, example: 0.82 })
  @IsOptional()
  @IsNumber({}, { message: 'AI güven skoru sayı olmalı.' })
  @Min(0, { message: 'AI güven skoru 0 ile 1 arasında olmalı.' })
  @Max(1, { message: 'AI güven skoru 0 ile 1 arasında olmalı.' })
  aiConfidence?: number;
}
