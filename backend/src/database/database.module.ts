import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Veritabanı bağlantısı. Entity'ler autoLoadEntities ile modüllerden toplanır,
 * böylece yeni bir modül eklendiğinde burası değişmez.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host') ?? 'localhost',
        port: config.get<number>('database.port') ?? 5432,
        username: config.get<string>('database.username') ?? 'kombin',
        password: config.get<string>('database.password') ?? '',
        database: config.get<string>('database.database') ?? 'kombin',
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize') ?? false,
        logging: config.get<boolean>('database.logging') ?? false,
        // Yönetilen veritabanlarında sertifika doğrulaması açık kalır.
        // Self-signed sertifika gerekiyorsa DB_SSL_CA ile CA verilmelidir.
        ssl: config.get<boolean>('database.ssl')
          ? { rejectUnauthorized: true, ca: process.env.DB_SSL_CA }
          : false,
        // Docker Compose'da postgres API'den geç ayağa kalkabiliyor.
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
