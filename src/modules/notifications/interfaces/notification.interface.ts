// src/modules/notifications/interfaces/notification.interface.ts
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';

export interface INotificationChannel {
  send(notification: NotificationRequest): Promise<NotificationResult>;
  validateConfig(): Promise<boolean>;
  getChannelType(): NotificationChannel;
}

export interface NotificationRequest {
  id?: string;
  type: string;
  channel: NotificationChannel;
  recipientId: string;
  recipientEmail: string;
  recipientPhone?: string;
  subject: string;
  content: string;
  htmlContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  maxRetries?: number;
}

export interface NotificationEvent {
  type: string;
  recipientId: string;
  recipientEmail?: string;  // Direct email, bypasses lookup
  recipientPhone?: string;  // Direct phone, bypasses lookup
  channel?: NotificationChannel | NotificationChannel[];
  data?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  templateOverrides?: {
    subject?: string;
    content?: string;
  };
}

export interface BulkNotificationEvent {
  type: string;
  recipients: Array<{
    recipientId: string;
    recipientEmail: string;
    recipientPhone?: string;
    customData?: Record<string, any>;
  }>;
  channel: NotificationChannel | NotificationChannel[];
  data?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledAt?: Date;
}

export interface NotificationResult {
  success: boolean;
  providerId?: string;
  providerMessageId?: string;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  sentAt?: Date;
}

export interface TemplateRenderRequest {
  templateId?: string;
  templateName?: string;
  channel: NotificationChannel;
  data: Record<string, any>;
  recipientId?: string;
}

export interface TemplateRenderResult {
  subject: string;
  content: string;
  htmlContent?: string;
}
