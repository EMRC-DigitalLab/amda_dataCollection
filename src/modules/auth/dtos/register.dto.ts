// src/modules/auth/dtos/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

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
  @Matches(
    /^(\+?234|0)[789]\d{9}$|^(\+?233|0)[2459]\d{8}$|^(\+?254|0)[17]\d{8}$|^(\+?256|0)[37]\d{8}$|^(\+?27|0)[1-9]\d{8}$/,
    {
      message:
        'Invalid African phone number format. Supported: Nigeria, Ghana, Kenya, Uganda, South Africa',
    }
  )
  phoneNumber!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  password!: string;
}
