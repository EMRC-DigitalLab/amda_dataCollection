import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExportType, ExportFormat } from '../interfaces/export.interface';

export class DateRangeDto {
  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;
}

export class ExportRequestDto {
  @IsEnum(ExportType)
  exportType!: ExportType;

  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsOptional()
  @IsUUID()
  formTypeId?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  submissionStatus?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;
}

export class BulkExportRequestDto {
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString({ each: true })
  formTypeIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  memberIds?: string[];

  @IsOptional()
  @IsString({ each: true })
  siteIds?: string[];
}

export class ExportHistoryDto {
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @IsOptional()
  @IsEnum(ExportType)
  exportType?: ExportType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExportPreviewDto {
  @IsEnum(ExportType)
  exportType!: ExportType;

  @IsOptional()
  @IsUUID()
  formTypeId?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}
