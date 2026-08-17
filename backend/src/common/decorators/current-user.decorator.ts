import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** JwtStrategy.validate() çıktısı — request.user'ın şekli. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * Aktif kullanıcıyı (veya tek bir alanını) verir.
 *   @CurrentUser() user: AuthenticatedUser
 *   @CurrentUser('userId') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
