import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../modules/users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';
import type { UserRole } from '../types/domain.types';

/**
 * @Roles(...) ile işaretlenmiş handler'ları korur.
 *
 * Rol bilgisi JWT'den değil her istekte DB'den okunur: aksi halde yetkisi
 * alınan ya da pasife alınan bir kullanıcı, elindeki access token'ın süresi
 * dolana kadar yönetici olarak kalmaya devam ederdi.
 *
 * UsersService yerine doğrudan Repository<User> enjekte edilir; böylece guard
 * common altında kalır ve UsersModule <-> common arasında dairesel bağımlılık
 * oluşmaz.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // İşaretsiz (ya da boş listeli) endpoint'ler bu guard'ın konusu değil.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Oturum bilgisi bulunamadı');
    }

    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Oturum bilgisi geçersiz');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Hesabın devre dışı bırakılmış');
    }

    if (!required.includes(user.role)) {
      throw new ForbiddenException('Bu işlem için yönetici yetkisi gerekiyor');
    }

    return true;
  }
}
