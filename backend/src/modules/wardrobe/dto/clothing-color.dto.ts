import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  COLOR_FAMILIES,
  type ColorFamily,
} from '../../../common/types/domain.types';

export class ClothingColorDto {
  @ApiProperty({ example: 'Lacivert' })
  @IsString({ message: 'Renk adı metin olmalı.' })
  @MinLength(1, { message: 'Renk adı boş olamaz.' })
  @MaxLength(64, { message: 'Renk adı çok uzun.' })
  name!: string;

  @ApiProperty({ example: '#1B2A4A', description: '6 haneli hex kodu' })
  @Matches(/^#([0-9a-fA-F]{6})$/, {
    message: 'Renk kodu #RRGGBB biçiminde olmalı.',
  })
  hex!: string;

  @ApiProperty({ enum: COLOR_FAMILIES, example: 'navy' })
  @IsIn(COLOR_FAMILIES, { message: 'Geçersiz renk ailesi.' })
  family!: ColorFamily;
}
