// src/modules/notifications/channels/push.channel.ts
import { NotificationChannel } from '@/database/entities/notification.entity';
import {
  INotificationChannel,
  NotificationRequest,
  NotificationResult,
} from '../interfaces/notification.interface';
import { logger } from '@/shared/utils/logger';

export class PushChannel implements INotificationChannel {
  async send(notification: NotificationRequest): Promise<NotificationResult> {
    try {
      // Implement Firebase/FCM or other push provider logic here
      logger.info(`Push notification sent to ${notification.recipientId}: ${notification.subject}`);

      return {
        success: true,
        providerId: 'mock-push',
        providerMessageId: `push-${Date.now()}`,
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
    return true; // Implement actual validation
  }

  getChannelType(): NotificationChannel {
    return NotificationChannel.PUSH;
  }
}
