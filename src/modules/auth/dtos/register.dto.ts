// src/modules/auth/dtos/register.dto.ts
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  country!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  password!: string;
}
