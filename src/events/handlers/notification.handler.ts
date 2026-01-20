// src/events/handlers/notification.handler.ts
import { AppDataSource } from '@/config';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { User } from '@/database/entities/user.entity';
import {
  BulkNotificationEvent,
  NotificationEvent,
} from '@/modules/notifications/interfaces/notification.interface';
import { NotificationService } from '@/modules/notifications/services/notification.service';
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
        // Use provided email/phone if available, otherwise lookup
        let recipient: { email: string; phone?: string };
        
        if (event.recipientEmail) {
          // Use directly provided email (bypasses lookup)
          recipient = {
            email: event.recipientEmail,
            phone: event.recipientPhone,
          };
        } else {
          // Get user's email/phone based on recipientId
          recipient = await this.getRecipientInfo(event.recipientId);
        }

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
   */
  private async getRecipientInfo(recipientId: string): Promise<{
    email: string;
    phone?: string;
  }> {
    try {
      // First try to find as User
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: recipientId } });
      
      if (user) {
        return {
          email: user.email,
          phone: user.phoneNumber || undefined,
        };
      }
      
      // If not found, try to find as Member
      const { Member } = await import('@/database/entities/member.entity');
      const memberRepo = AppDataSource.getRepository(Member);
      const member = await memberRepo.findOne({ where: { id: recipientId } });
      
      if (member) {
        return {
          email: member.primaryContactEmail!,
          phone: member.contact1Phone || undefined,
        };
      }

      logger.warn(`Notification handler: User/Member not found for ID ${recipientId}`);
      return { email: '', phone: '' }; 
    } catch (error) {
       logger.error(`Error fetching recipient info for ${recipientId}:`, error);
       return { email: '', phone: '' };
    }
  }
}
