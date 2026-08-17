import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LocalStorageDriver } from './drivers/local-storage.driver';
import { STORAGE_DRIVER, StorageDriver } from './interfaces/storage-driver.interface';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageDriver,
    {
      // Sürücü seçimi tek yerde; yeni sürücü eklemek buraya bir dal eklemek demek.
      provide: STORAGE_DRIVER,
      inject: [ConfigService, LocalStorageDriver],
      useFactory: (config: ConfigService, local: LocalStorageDriver): StorageDriver => {
        const driver = config.get<string>('storage.driver') ?? 'local';
        if (driver === 'local') return local;
        throw new Error(`Desteklenmeyen depolama sürücüsü: ${driver}`);
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
