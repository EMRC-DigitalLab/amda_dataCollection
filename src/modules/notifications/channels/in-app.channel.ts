// src/modules/notifications/channels/in-app.channel.ts
import { NotificationChannel } from '@/database/entities/notification.entity';
import {
  INotificationChannel,
  NotificationRequest,
  NotificationResult,
} from '../interfaces/notification.interface';
import { logger } from '@/shared/utils/logger';
export class InAppChannel implements INotificationChannel {
  async send(notification: NotificationRequest): Promise<NotificationResult> {
    try {
      // Store in-app notification in database or emit to real-time service
      logger.info(
        `In-app notification created for ${notification.recipientId}: ${notification.subject}`
      );

      return {
        success: true,
        providerId: 'in-app',
        providerMessageId: `in-app-${Date.now()}`,
        sentAt: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message,
        errorDetails: { error: error.toString() },
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    return true;
  }

  getChannelType(): NotificationChannel {
    return NotificationChannel.IN_APP;
  }
}
