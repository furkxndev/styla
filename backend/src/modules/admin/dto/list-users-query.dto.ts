import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import type { UserRole } from '../../../common/types/domain.types';

/** Sayfa boyutu sınırları — tek noktadan değişsin diye burada. */
export const ADMIN_USERS_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_USERS_MAX_PAGE_SIZE = 100;

/**
 * Query string'ten gelen değer boolean'a çevrilir.
 *
 * Ham değer (`obj[key]`) okunur: ValidationPipe'ın `enableImplicitConversion`
 * ayarı "false" metnini `Boolean('false') === true` yaparak bozar, bu yüzden
 * dönüştürülmüş değere güvenilemez.
 */
const toOptionalBoolean = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) => {
  const raw = obj[key];
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (raw === true || raw === 'true' || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === '0') return false;
  // Tanınmayan değer olduğu gibi bırakılır; hatayı @IsBoolean üretir.
  return raw;
};

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    description: 'E-posta veya ad-soyad içinde arar',
    example: 'ayse',
  })
  @IsOptional()
  @IsString({ message: 'Arama terimi metin olmalıdır.' })
  @MaxLength(120, { message: 'Arama terimi en fazla 120 karakter olabilir.' })
  search?: string;

  @ApiPropertyOptional({ enum: ['user', 'admin'] })
  @IsOptional()
  @IsIn(['user', 'admin'], {
    message: 'Rol yalnızca "user" veya "admin" olabilir.',
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Aktiflik durumuna göre filtreler',
    example: true,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean({ message: 'Aktiflik değeri true veya false olmalıdır.' })
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sayfa numarası tam sayı olmalıdır.' })
  @Min(1, { message: 'Sayfa numarası en az 1 olmalıdır.' })
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ADMIN_USERS_MAX_PAGE_SIZE,
    default: ADMIN_USERS_DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sayfa boyutu tam sayı olmalıdır.' })
  @Min(1, { message: 'Sayfa boyutu en az 1 olmalıdır.' })
  @Max(ADMIN_USERS_MAX_PAGE_SIZE, {
    message: `Sayfa boyutu en fazla ${ADMIN_USERS_MAX_PAGE_SIZE} olabilir.`,
  })
  pageSize?: number;
}
