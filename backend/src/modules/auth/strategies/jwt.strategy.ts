import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    const accessSecret = config.get<string>('jwt.accessSecret');
    // Anahtar yoksa uygulama sessizce güvensiz çalışmamalı.
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET tanımlı değil');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  /**
   * Her istekte kullanıcının hâlâ var ve aktif olduğu doğrulanır.
   * Aksi hâlde pasife alınan bir hesap, elindeki geçerli access token'ın
   * süresi dolana kadar API'yi kullanmaya devam ederdi.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Oturum bilgisi geçersiz');
    }

    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Oturum bilgisi geçersiz');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Hesabın devre dışı bırakılmış');
    }

    return { userId: user.id, email: user.email };
  }
}
