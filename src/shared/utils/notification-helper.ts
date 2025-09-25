// src/shared/utils/notification-helper.ts
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { NotificationEmitter } from '@/events/emitters/notification.emitter';
import { NotificationEventHandler } from '@/events/handlers/notification.handler';
import { EmailChannel } from '@/modules/notifications/channels/email.channel';
import { InAppChannel } from '@/modules/notifications/channels/in-app.channel';
import { PushChannel } from '@/modules/notifications/channels/push.channel';
import { SmsChannel } from '@/modules/notifications/channels/sms.channel';
import { WebhookChannel } from '@/modules/notifications/channels/webhook.channel';
import { NotificationChannelFactory } from '@/modules/notifications/services/channel-factory.service';
import { NotificationQueueService } from '@/modules/notifications/services/notification-queue.service';
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { TemplateService } from '@/modules/notifications/services/template.service';

// Initialize dependencies
const templateService = new TemplateService();
const queueService = new NotificationQueueService();

// Initialize channels
const emailChannel = new EmailChannel();
const smsChannel = new SmsChannel();
const pushChannel = new PushChannel();
const webhookChannel = new WebhookChannel();
const inAppChannel = new InAppChannel();

// Initialize channel factory
const channelFactory = new NotificationChannelFactory(
  emailChannel,
  smsChannel,
  pushChannel,
  webhookChannel,
  inAppChannel
);

// Create notification service
const notificationService = new NotificationService(templateService, channelFactory, queueService);

// Create notification handler
const notificationHandler = new NotificationEventHandler(notificationService);

// Create notification emitter
const notificationEmitter = new NotificationEmitter(notificationHandler);

export class NotificationHelper {
  static async sendWelcome(userId: string, userEmail: string, userName: string): Promise<void> {
    notificationEmitter.emitNotification({
      type: 'welcome',
      recipientId: userId,
      data: {
        userName,
        userEmail,
        loginUrl: 'https://app.amda.com/login',
        supportUrl: 'https://support.amda.com',
      },
    });
  }

  static async sendPaymentReminder(
    userId: string,
    invoiceData: {
      invoiceNumber: string;
      amount: number;
      dueDate: string;
      paymentUrl: string;
    }
  ): Promise<void> {
    notificationEmitter.emitNotification({
      type: 'payment_reminder',
      recipientId: userId,
      data: invoiceData,
      priority: NotificationPriority.HIGH,
      channel: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    });
  }

  static async sendMaintenanceNotification(
    userIds: string[],
    maintenanceData: {
      startTime: string;
      endTime: string;
      affectedServices: string[];
    }
  ): Promise<void> {
    notificationEmitter.emitBulkNotification({
      type: 'system_maintenance',
      recipients: userIds.map(id => ({
        recipientId: id,
        recipientEmail: '',
        recipientPhone: '',
      })),
      channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      data: maintenanceData,
      priority: NotificationPriority.HIGH,
    });
  }

  static async sendCustomNotification(
    userId: string,
    notificationType: string,
    templateData: Record<string, any>,
    options?: {
      channel?: NotificationChannel | NotificationChannel[];
      priority?: NotificationPriority;
      scheduledAt?: Date;
    }
  ): Promise<void> {
    notificationEmitter.emitNotification({
      type: notificationType,
      recipientId: userId,
      data: templateData,
      channel: options?.channel,
      priority: options?.priority,
      scheduledAt: options?.scheduledAt,
    });
  }
}
