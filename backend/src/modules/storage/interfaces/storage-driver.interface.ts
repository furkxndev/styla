/** DI token — StorageService somut sürücüyü değil bu arayüzü tanır. */
export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

/** Multer dosyasının sürücünün ihtiyaç duyduğu minimum alanları. */
export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface StorageSaveResult {
  /** İstemcinin doğrudan kullanabileceği tam URL */
  url: string;
  /** Silme işlemi için sürücüye özel anahtar (local'de dosya adı) */
  key: string;
}

/**
 * Depolama sürücüsü sözleşmesi. İleride S3'e geçiş yalnızca yeni bir
 * implementasyon + StorageModule factory değişikliği gerektirir.
 */
export interface StorageDriver {
  save(file: StorageFile): Promise<StorageSaveResult>;
  remove(key: string): Promise<void>;
}
