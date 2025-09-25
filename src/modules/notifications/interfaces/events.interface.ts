// src/modules/notifications/interfaces/events.interface.ts
// src/modules/notifications/interfaces/notification.interface.ts
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
export interface NotificationEvent {
  type: string;
  recipientId: string;
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
