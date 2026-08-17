import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ayse@example.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'CokGizliSifre123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalı' })
  @MaxLength(72, { message: 'Şifre en fazla 72 karakter olabilir' })
  password!: string;

  @ApiProperty({ example: 'Ayşe Yılmaz' })
  @IsString()
  @MinLength(2, { message: 'Ad soyad en az 2 karakter olmalı' })
  @MaxLength(120)
  fullName!: string;
}
