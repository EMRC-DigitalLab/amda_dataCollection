// src/modules/auth/dtos/refresh-token.dto.ts
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
