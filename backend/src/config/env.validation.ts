import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/**
 * Uygulama açılışında zorunlu environment variable'ları doğrular.
 * Eksik/hatalı değer varsa uygulama başlamaz — sessiz hata oluşmaz.
 */
class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @IsNumberString()
  DB_PORT!: string;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE!: string;

  @IsOptional()
  @IsBooleanString()
  DB_SYNCHRONIZE?: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET en az 32 karakter olmalı' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET en az 32 karakter olmalı' })
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsIn(['openrouter'], { message: 'AI_PROVIDER şu an yalnızca "openrouter" olabilir' })
  AI_PROVIDER?: string;

  /**
   * Yalnızca aktif sağlayıcı OpenRouter ise zorunludur.
   * Böylece ileride başka bir sağlayıcıya geçilince bu anahtar aranmaz.
   */
  @ValidateIf((env: EnvironmentVariables) => (env.AI_PROVIDER ?? 'openrouter') === 'openrouter')
  @IsString()
  @IsNotEmpty({ message: 'OPENROUTER_API_KEY zorunlu — AI özellikleri buna bağlı' })
  OPENROUTER_API_KEY!: string;

  @IsOptional()
  @IsString()
  OPENROUTER_MODEL?: string;

  @IsOptional()
  @IsString()
  OPENROUTER_VISION_MODEL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  /** Tanımlıysa bu hesap açılışta admin yapılır; tanımsızsa bootstrap atlanır. */
  @IsOptional()
  @IsEmail({}, { message: 'ADMIN_EMAIL geçerli bir e-posta olmalı' })
  ADMIN_EMAIL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const instance = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(instance, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Environment yapılandırması geçersiz:\n  - ${details}`);
  }

  return config;
}
