import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    // Kayıt açık/kapalı bilgisi admin panelinden yönetilir
    SettingsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Secret/expiry her imzalamada açıkça verilir (access ve refresh farklı anahtar kullanır).
    JwtModule.register({}),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
