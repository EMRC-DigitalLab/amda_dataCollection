// src/modules/auth/dtos/forgot-password.dto.ts
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}
