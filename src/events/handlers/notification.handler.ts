// src/events/handlers/notification.handler.ts
import { NotificationService } from '@/modules/notifications/services/notification.service';
import {
  NotificationEvent,
  BulkNotificationEvent,
} from '@/modules/notifications/interfaces/notification.interface';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { logger } from '@/shared/utils/logger';

export class NotificationEventHandler {
  constructor(private notificationService: NotificationService) {}

  /**
   * Handle single notification event
   */
  async handleNotificationEvent(event: NotificationEvent): Promise<void> {
    try {
      const channels = Array.isArray(event.channel)
        ? event.channel
        : event.channel
          ? [event.channel]
          : [];

      // If no channels specified, determine based on notification type
      const targetChannels =
        channels.length > 0 ? channels : await this.getDefaultChannelsForType(event.type);

      for (const channel of targetChannels) {
        // Get user's email/phone based on recipientId
        const recipient = await this.getRecipientInfo(event.recipientId);

        await this.notificationService.sendNotification({
          type: event.type,
          channel,
          recipientId: event.recipientId,
          recipientEmail: recipient.email,
          recipientPhone: recipient.phone,
          subject: event.templateOverrides?.subject || '',
          content: event.templateOverrides?.content || '',
          templateData: event.data,
          priority: event.priority || NotificationPriority.NORMAL,
          scheduledAt: event.scheduledAt,
        });
      }

      logger.info(`Notification event processed: ${event.type} for ${event.recipientId}`);
    } catch (error) {
      logger.error('Error handling notification event:', error);
      throw error;
    }
  }

  /**
   * Handle bulk notification event
   */
  async handleBulkNotificationEvent(event: BulkNotificationEvent): Promise<void> {
    try {
      await this.notificationService.sendBulkNotification(event);
      logger.info(
        `Bulk notification event processed: ${event.type} for ${event.recipients.length} recipients`
      );
    } catch (error) {
      logger.error('Error handling bulk notification event:', error);
      throw error;
    }
  }

  /**
   * Get default notification channels for a specific notification type
   */
  private async getDefaultChannelsForType(type: string): Promise<NotificationChannel[]> {
    // Define default channels based on notification type
    const channelMap: Record<string, NotificationChannel[]> = {
      welcome: [NotificationChannel.EMAIL],
      payment_reminder: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      payment_success: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      payment_failed: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      account_locked: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      password_reset: [NotificationChannel.EMAIL],
      system_maintenance: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      invoice_generated: [NotificationChannel.EMAIL],
      low_balance: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    };

    return channelMap[type] || [NotificationChannel.EMAIL];
  }

  /**
   * Get recipient information by ID
   * This would typically fetch from your user/customer database
   */
  private async getRecipientInfo(_recipientId: string): Promise<{
    email: string;
    phone?: string;
  }> {
    // Placeholder - implement actual user lookup
    // const user = await userRepository.findOne({ where: { id: recipientId } });
    return {
      email: 'user@example.com', // Replace with actual lookup
      phone: '+1234567890', // Replace with actual lookup
    };
  }
}
