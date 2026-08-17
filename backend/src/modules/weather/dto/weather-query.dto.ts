import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Hava durumu sorgusu. Üç alan da opsiyoneldir; hiçbiri gelmezse
 * servis varsayılan konumu (İstanbul) kullanır.
 */
export class WeatherQueryDto {
  @ApiPropertyOptional({ description: 'Enlem', example: 41.0082 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'Enlem değeri geçersiz.' })
  lat?: number;

  @ApiPropertyOptional({ description: 'Boylam', example: 28.9784 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'Boylam değeri geçersiz.' })
  lon?: number;

  @ApiPropertyOptional({ description: 'Şehir adı (koordinat yoksa kullanılır)', example: 'İstanbul' })
  @IsOptional()
  @IsString({ message: 'Şehir adı metin olmalıdır.' })
  @MaxLength(80, { message: 'Şehir adı en fazla 80 karakter olabilir.' })
  city?: string;
}
