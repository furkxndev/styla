import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ayse@example.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'CokGizliSifre123' })
  @IsString()
  @IsNotEmpty({ message: 'Şifre boş olamaz' })
  @MaxLength(72)
  password!: string;
}
