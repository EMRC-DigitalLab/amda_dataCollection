import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../../../shared/types/form.types';

export class CreateQuestionDtoClass {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  kpi!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum([
    'text',
    'textarea',
    'number',
    'currency',
    'date',
    'datetime',
    'boolean',
    'select',
    'multiselect',
    'file',
    'email',
    'phone',
    'url',
  ])
  type!: QuestionType;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  options?: Record<string, any>;
}

export class CreateCategoryDtoClass {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDtoClass)
  questions?: CreateQuestionDtoClass[];
}

export class CreateFormDtoClass {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  formType?: string;

  @IsOptional()
  @IsString()
  adminId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryDtoClass)
  categories?: CreateCategoryDtoClass[];
}

export interface Pagination {
  skip?: number;
  take?: number;
}
