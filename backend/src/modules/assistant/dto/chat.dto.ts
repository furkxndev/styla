import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { ChatRole } from '../../../common/types/domain.types';

/** Frontend'in AI'a bağlam olarak gönderdiği önceki mesajlar */
export class ChatHistoryItemDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'], { message: 'role yalnızca user veya assistant olabilir.' })
  role: ChatRole;

  @ApiProperty({ maxLength: 2000 })
  @IsString({ message: 'content metin olmalıdır.' })
  @MaxLength(2000, { message: 'content en fazla 2000 karakter olabilir.' })
  content: string;
}

export class ChatDto {
  @ApiProperty({ minLength: 1, maxLength: 1000, example: 'Bugün ne giysem?' })
  @IsString({ message: 'message metin olmalıdır.' })
  @MinLength(1, { message: 'message boş olamaz.' })
  @MaxLength(1000, { message: 'message en fazla 1000 karakter olabilir.' })
  message: string;

  @ApiPropertyOptional({ type: [ChatHistoryItemDto], maxItems: 20 })
  @IsOptional()
  @IsArray({ message: 'history dizi olmalıdır.' })
  @ArrayMaxSize(20, { message: 'history en fazla 20 mesaj içerebilir.' })
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];

  @ApiPropertyOptional({ format: 'uuid', description: 'Soru belirli bir parça hakkındaysa' })
  @IsOptional()
  @IsUUID('4', { message: 'focusItemId geçerli bir uuid olmalıdır.' })
  focusItemId?: string;
}
