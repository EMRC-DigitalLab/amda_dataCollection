// src/modules/auth/dtos/verify-member.dto.ts
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class VerifyMemberDto {
  @IsBoolean()
  isVerified!: boolean;

  @IsOptional()
  @IsUUID()
  verifiedByAdminId?: string;
}

export class BulkVerifyMemberDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  memberIds!: string[];

  @IsBoolean()
  isVerified!: boolean;
}

export class SearchMembersDto {
  @IsOptional()
  q?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verified?: boolean;

  @IsOptional()
  country?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
