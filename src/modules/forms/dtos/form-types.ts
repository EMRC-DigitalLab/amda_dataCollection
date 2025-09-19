import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { FormTypeStatus } from '../../../database/entities/form-type.entity';

export class CreateFormTypeDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9\-_]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, hyphens, and underscores',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsEnum(FormTypeStatus)
  status?: FormTypeStatus;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color must be a valid hex color code',
  })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
