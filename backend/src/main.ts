import { join } from 'node:path';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  // bufferLogs: açılıştaki hatalar da Nest logger formatıyla görünsün.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = config.get<number>('app.port') ?? 4000;
  const apiPrefix = config.get<string>('app.apiPrefix') ?? 'api/v1';
  const corsOrigins = config.get<string[]>('app.corsOrigins') ?? ['*'];
  const localDir = config.get<string>('storage.localDir') ?? 'uploads';
  const swaggerEnabled = config.get<boolean>('app.swaggerEnabled') ?? false;

  app.use(
    helmet({
      // Yüklenen görseller mobil istemciden (farklı origin) çekiliyor.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Kimlik doğrulama Bearer token ile yapılır; cookie gerekmediği için
  // origin '*' iken credentials açık bırakılmaz (tarayıcı tarafı CSRF yüzeyi).
  const allowAnyOrigin = corsOrigins.includes('*');
  app.enableCors({
    origin: allowAnyOrigin ? true : corsOrigins,
    credentials: !allowAnyOrigin,
  });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Yüklenen görseller global prefix'in DIŞINDA, doğrudan /uploads altından servis edilir.
  app.useStaticAssets(join(process.cwd(), localDir), { prefix: `/${localDir}` });

  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Kombin API')
        .setDescription('Kombin AI kişisel stil asistanı backend servisi')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  // SIGTERM/SIGINT geldiğinde bağlantılar düzgün kapatılsın.
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`API hazır: ${await app.getUrl()}/${apiPrefix}`);
  if (swaggerEnabled) logger.log(`Swagger: ${await app.getUrl()}/docs`);
}

void bootstrap();
