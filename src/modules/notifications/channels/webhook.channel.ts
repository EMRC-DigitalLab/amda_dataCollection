// src/modules/notifications/channels/webhook.channel.ts
import { NotificationChannel } from '@/database/entities/notification.entity';
import {
  INotificationChannel,
  NotificationRequest,
  NotificationResult,
} from '../interfaces/notification.interface';
import { logger } from '@/shared/utils/logger';

export class WebhookChannel implements INotificationChannel {
  async send(notification: NotificationRequest): Promise<NotificationResult> {
    try {
      // Implement webhook sending logic here
      const webhookUrl = notification.metadata?.webhookUrl;
      if (!webhookUrl) {
        throw new Error('Webhook URL not provided in metadata');
      }

      const payload = {
        id: notification.id,
        type: notification.type,
        recipientId: notification.recipientId,
        subject: notification.subject,
        content: notification.content,
        metadata: notification.metadata,
        timestamp: new Date().toISOString(),
      };

      // Use fetch or axios to send webhook
      logger.info(`Webhook sent to ${webhookUrl} for notification ${notification.id}`);
      // Use fetch or axios to send webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      return {
        success: true,
        providerId: 'webhook',
        providerMessageId: `webhook-${Date.now()}`,
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
    return NotificationChannel.WEBHOOK;
  }
}
