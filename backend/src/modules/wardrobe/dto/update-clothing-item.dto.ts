import { PartialType } from '@nestjs/swagger';
import { CreateClothingItemDto } from './create-clothing-item.dto';

/** Tüm alanlar opsiyonel; gönderilen alanlar kullanıcı düzenlemesi sayılır. */
export class UpdateClothingItemDto extends PartialType(CreateClothingItemDto) {}
