import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_DRIVER } from './interfaces/storage-driver.interface';
// Arayüz tipleri decorator metadata'sına sızmasın diye 'import type' ile alınır.
import type {
  StorageDriver,
  StorageFile,
  StorageSaveResult,
} from './interfaces/storage-driver.interface';

/**
 * Depolama giriş noktası. Modüller sürücüyü değil bu servisi kullanır,
 * böylece local -> S3 geçişi çağıran kodu etkilemez.
 */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_DRIVER) private readonly driver: StorageDriver) {}

  save(file: StorageFile): Promise<StorageSaveResult> {
    return this.driver.save(file);
  }

  remove(key: string): Promise<void> {
    return this.driver.remove(key);
  }

  /** AI sağlayıcısına görsel gönderilirken kullanılan base64 data URL. */
  toDataUrl(file: StorageFile): string {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
}
