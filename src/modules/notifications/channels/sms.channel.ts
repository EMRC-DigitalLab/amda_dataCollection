// src/modules/notifications/channels/sms.channel.ts
import { logger } from '@/shared/utils/logger';
import {
  INotificationChannel,
  NotificationRequest,
  NotificationResult,
} from '../interfaces/notification.interface';
import { NotificationChannel } from '@/database/entities/notification.entity';
export class SmsChannel implements INotificationChannel {
  // Placeholder for SMS provider integration (Twilio, etc.)

  async send(notification: NotificationRequest): Promise<NotificationResult> {
    try {
      // Implement SMS provider logic here
      logger.info(`SMS sent to ${notification.recipientPhone}: ${notification.content}`);

      return {
        success: true,
        providerId: 'mock-sms',
        providerMessageId: `sms-${Date.now()}`,
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
    return NotificationChannel.SMS;
  }
}
