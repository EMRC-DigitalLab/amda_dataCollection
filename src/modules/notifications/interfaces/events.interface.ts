// src/modules/notifications/interfaces/events.interface.ts
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
