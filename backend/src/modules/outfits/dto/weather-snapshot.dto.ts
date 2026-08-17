import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  WEATHER_CONDITIONS,
  type WeatherCondition,
} from '../../../common/types/domain.types';

/**
 * İstemciden gelen hava durumu bilgisi.
 *
 * Bu nesne hem veritabanına (jsonb) hem de AI prompt'una gidiyor; bu yüzden
 * iç alanları da doğrulanır. Aksi halde `@IsObject()` ile gelen rastgele/dev
 * boyutlu JSON doğrudan geçerdi.
 */
class CoordinatesDto {
  @ApiProperty({ example: 41.0082 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 28.9784 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

class HourlyForecastDto {
  @ApiProperty()
  @IsISO8601()
  time: string;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(70)
  temperature: number;

  @ApiProperty({ enum: WEATHER_CONDITIONS })
  @IsIn(WEATHER_CONDITIONS)
  condition: WeatherCondition;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  precipitationProbability: number;
}

export class WeatherSnapshotDto {
  @ApiProperty({ example: 'İstanbul' })
  @IsString()
  @MaxLength(80)
  city: string;

  // Open-Meteo ülke adını açık biçimde döner ("Türkiye Cumhuriyeti"), kısa kod değil.
  @ApiPropertyOptional({ example: 'Türkiye Cumhuriyeti' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(70)
  temperature: number;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(70)
  feelsLike: number;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(70)
  minTemperature: number;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(70)
  maxTemperature: number;

  @ApiProperty({ enum: WEATHER_CONDITIONS })
  @IsIn(WEATHER_CONDITIONS)
  condition: WeatherCondition;

  @ApiProperty({ example: 'Parçalı bulutlu' })
  @IsString()
  @MaxLength(120)
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity: number;

  @ApiProperty({ description: 'km/s' })
  @IsNumber()
  @Min(0)
  @Max(500)
  windSpeed: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  precipitationProbability: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  uvIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  sunrise?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  sunset?: string;

  @ApiProperty({ type: [HourlyForecastDto] })
  @IsArray()
  @ArrayMaxSize(48, { message: 'Saatlik tahmin en fazla 48 kayıt olabilir' })
  @ValidateNested({ each: true })
  @Type(() => HourlyForecastDto)
  hourly: HourlyForecastDto[];

  @ApiProperty()
  @IsISO8601()
  fetchedAt: string;
}
