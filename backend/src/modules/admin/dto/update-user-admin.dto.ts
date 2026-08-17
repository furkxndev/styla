import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

import type { UserRole } from '../../../common/types/domain.types';

/**
 * Yöneticinin bir kullanıcı üzerinde değiştirebildiği tek şey rol ve aktiflik.
 * Profil alanları (ad, tercihler) kullanıcının kendi ucundan yönetilir; bu
 * yüzden burada bilinçli olarak yer almaz.
 */
export class UpdateUserAdminDto {
  @ApiPropertyOptional({ enum: ['user', 'admin'] })
  @IsOptional()
  @IsIn(['user', 'admin'], {
    message: 'Rol yalnızca "user" veya "admin" olabilir.',
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'false ise kullanıcı giriş yapamaz',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Aktiflik değeri true veya false olmalıdır.' })
  isActive?: boolean;
}
