// src/modules/notifications/dtos/notification.dto.ts
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  type!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsUUID()
  recipientId!: string;

  @IsEmail()
  recipientEmail!: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsString()
  subject!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;
}

export class BulkNotificationDto {
  @IsString()
  type!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsArray()
  recipients!: Array<{
    recipientId: string;
    recipientEmail: string;
    recipientPhone?: string;
    customData?: Record<string, any>;
  }>;

  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;
}

export class NotificationQueryDto {
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class UpdateNotificationPreferenceDto {
  @IsString()
  type!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class MarkNotificationsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds!: string[];
}

export class UserNotificationQueryDto {
  @IsOptional()
  @IsString()
  isRead?: string;

  @IsOptional()
  @IsString()
  isArchived?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
