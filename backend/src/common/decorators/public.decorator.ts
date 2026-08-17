import { SetMetadata } from '@nestjs/common';

/** Global JwtAuthGuard bu metadata'yı görürse kimlik doğrulamayı atlar. */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
