import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Kısmi güncelleme: gönderilmeyen alanlar mevcut ayardan korunur.
 * Sınırlar bilinçli olarak dar tutuldu — hatalı bir yönetici girdisi
 * anında tüm AI maliyetini veya kalitesini bozabilir.
 */
export class UpdateSettingsDto {
  @ApiPropertyOptional({
    example: 'anthropic/claude-sonnet-4.5',
    description: 'Metin üretimi (kombin önerisi + asistan) için kullanılacak model kimliği',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  aiModel?: string;

  @ApiPropertyOptional({
    example: 'anthropic/claude-sonnet-4.5',
    description: 'Kıyafet fotoğrafı analizinde kullanılacak görsel destekli model kimliği',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  aiVisionModel?: string;

  @ApiPropertyOptional({
    example: 0.7,
    description: 'Model yaratıcılığı (0 = tutarlı, 2 = çok değişken)',
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  aiTemperature?: number;

  @ApiPropertyOptional({
    example: 150,
    description: "AI prompt'una gönderilecek azami gardırop parçası sayısı (maliyet sınırı)",
    minimum: 10,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(500)
  maxWardrobeItemsPerPrompt?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Kapalıyken yeni kullanıcı kaydı alınmaz',
  })
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Kapalıyken tüm AI özellikleri devre dışı kalır (acil maliyet freni)',
  })
  @IsOptional()
  @IsBoolean()
  aiFeaturesEnabled?: boolean;
}
