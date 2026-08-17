import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  StorageDriver,
  StorageFile,
  StorageSaveResult,
} from '../interfaces/storage-driver.interface';

/**
 * İzin verilen görsel türleri ve uzantıları.
 * Uzantı istemcinin gönderdiği dosya adından ASLA türetilmez; yalnızca
 * doğrulanmış mimetype'tan gelir (depolanmış XSS / rastgele dosya barındırma riski).
 */
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

/**
 * Dosyaları sunucunun yerel diskine yazar (geliştirme ve tek sunuculu kurulum).
 * Üretimde S3 sürücüsüyle değiştirilebilir.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly localDir: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.localDir = this.config.get<string>('storage.localDir') ?? 'uploads';
    this.publicUrl = (this.config.get<string>('app.publicUrl') ?? '').replace(/\/+$/, '');
  }

  async save(file: StorageFile): Promise<StorageSaveResult> {
    const directory = this.resolveDirectory();
    // Klasör ilk yüklemede oluşabilir; her seferinde kontrol etmek ucuz.
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}${this.resolveExtension(file)}`;
    await writeFile(join(directory, filename), file.buffer);

    return {
      url: `${this.publicUrl}/${this.localDir}/${filename}`,
      key: filename,
    };
  }

  async remove(key: string): Promise<void> {
    // Anahtar dışarıdan gelebilir; dizin dışına çıkmayı engelle.
    const safeKey = key.replace(/[/\\]/g, '');
    if (!safeKey) return;

    try {
      await unlink(join(this.resolveDirectory(), safeKey));
    } catch {
      // Dosya zaten yoksa silme isteği başarılı sayılır.
      this.logger.warn(`Silinecek dosya bulunamadı: ${safeKey}`);
    }
  }

  private resolveDirectory(): string {
    return join(process.cwd(), this.localDir);
  }

  private resolveExtension(file: StorageFile): string {
    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Desteklenmeyen görsel türü');
    }
    return extension;
  }
}
