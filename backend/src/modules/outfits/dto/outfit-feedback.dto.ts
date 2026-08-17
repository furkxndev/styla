import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { DislikeReason } from '../../../common/types/domain.types';

const FEEDBACK_VALUES = ['liked', 'disliked', 'worn'] as const;

const DISLIKE_REASONS: DislikeReason[] = [
  'colors',
  'style',
  'weather',
  'occasion',
  'repetitive',
  'other',
];

export class OutfitFeedbackDto {
  @ApiProperty({ enum: FEEDBACK_VALUES, example: 'liked' })
  @IsIn(FEEDBACK_VALUES, { message: 'Geçersiz geri bildirim değeri' })
  feedback: 'liked' | 'disliked' | 'worn';

  @ApiPropertyOptional({ enum: DISLIKE_REASONS, example: 'colors' })
  @IsOptional()
  @IsIn(DISLIKE_REASONS, { message: 'Geçersiz geri bildirim nedeni' })
  reason?: DislikeReason;
}
