import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

import type { AuthSessionResponse, AuthTokens } from '../../common/types/domain.types';
import { User } from '../users/entities/user.entity';
import { toUserResponse } from '../users/mappers/user.mapper';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

/** Zamanlama saldırısına karşı sabit maliyetli karşılaştırma için kullanılır. */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('kombin-dummy-password', BCRYPT_ROUNDS);

/**
 * Refresh token'lar bcrypt'in 72 baytlık sınırından uzun olduğu için önce
 * sha256 ile sabit uzunluğa indirilir; aksi halde farklı token'lar aynı
 * ön eki paylaşıp eşleşebilirdi.
 */
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResponse> {
    // Yeni kayıt alımı admin panelinden kapatılabilir (kill-switch).
    if (!(await this.settings.isRegistrationEnabled())) {
      throw new ForbiddenException('Yeni kayıtlar şu anda kapalı');
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });

    return this.buildSession(user);
  }

  async login(dto: LoginDto): Promise<AuthSessionResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    // Kullanıcı bulunamasa da bcrypt karşılaştırması yapılır: aksi halde yanıt
    // süresi farkı "bu e-posta kayıtlı mı" sorusunu ele verirdi (zamanlama kanalı).
    const matches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !matches) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    // Şifre doğrulandıktan sonra bakılır: aksi halde hangi hesabın pasif
    // olduğu şifre bilinmeden öğrenilebilirdi.
    this.assertActive(user);

    return this.buildSession(user);
  }

  /** Rotasyon: her yenilemede eski refresh token geçersiz olur. */
  async refresh(refreshToken: string): Promise<AuthSessionResponse> {
    const refreshSecret = this.requireSecret('jwt.refreshSecret');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Yenileme anahtarı geçersiz veya süresi dolmuş');
    }

    const user = await this.usersService.findById(payload.sub).catch(() => null);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Oturum bulunamadı, tekrar giriş yapın');
    }

    const matches = await bcrypt.compare(digest(refreshToken), user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Yenileme anahtarı geçersiz veya süresi dolmuş');
    }

    // Pasife alınan hesap elindeki refresh token'la oturumunu uzatamamalı.
    this.assertActive(user);

    return this.buildSession(user);
  }

  /** isActive=false ise oturum açma/yenileme akışını keser. */
  private assertActive(user: User): void {
    if (user.isActive === false) {
      throw new UnauthorizedException('Hesabın devre dışı bırakılmış, yönetici ile iletişime geç');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  async me(userId: string) {
    return toUserResponse(await this.usersService.findById(userId));
  }

  /** Token çifti üretir ve refresh hash'ini kalıcılaştırır. */
  private async buildSession(user: User): Promise<AuthSessionResponse> {
    const tokens = await this.issueTokens(user);
    await this.usersService.setRefreshTokenHash(
      user.id,
      await bcrypt.hash(digest(tokens.refreshToken), BCRYPT_ROUNDS),
    );

    return { user: toUserResponse(user), tokens };
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.requireSecret('jwt.accessSecret'),
        expiresIn: this.readExpiresIn('jwt.accessExpiresIn', '1h'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.requireSecret('jwt.refreshSecret'),
        expiresIn: this.readExpiresIn('jwt.refreshExpiresIn', '30d'),
      }),
    ]);

    return { accessToken, refreshToken, expiresAt: this.readExpiry(accessToken) };
  }

  /** Frontend sürenin bitişini epoch ms olarak bekliyor. */
  private readExpiry(accessToken: string): number {
    const decoded = this.jwtService.decode<{ exp?: number } | null>(accessToken);
    if (!decoded?.exp) {
      throw new InternalServerErrorException('Token süresi okunamadı');
    }
    return decoded.exp * 1000;
  }

  /** '1h' gibi süre ifadeleri env'den gelir; ms kütüphanesinin literal tipi çıkarılamaz. */
  private readExpiresIn(key: string, fallback: string): JwtSignOptions['expiresIn'] {
    return (this.config.get<string>(key) ?? fallback) as JwtSignOptions['expiresIn'];
  }

  private requireSecret(key: string): string {
    const secret = this.config.get<string>(key);
    if (!secret) {
      throw new InternalServerErrorException('JWT yapılandırması eksik');
    }
    return secret;
  }
}
