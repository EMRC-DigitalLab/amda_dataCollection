// src/events/emitters/notification.emitter.ts
import { EventEmitter } from 'events';
import {
  NotificationEvent,
  BulkNotificationEvent,
} from '@/modules/notifications/interfaces/notification.interface';
import { NotificationEventHandler } from '../handlers/notification.handler';
import { NotificationPriority, NotificationChannel } from '@/database/entities/notification.entity';
import { logger } from '@/shared/utils/logger';

export class NotificationEmitter extends EventEmitter {
  constructor(private notificationHandler: NotificationEventHandler) {
    super();
    this.setupEventListeners();
  }

  /**
   * Emit a single notification event
   */
  emitNotification(event: NotificationEvent): void {
    logger.info(`Emitting notification event: ${event.type} for ${event.recipientId}`);
    this.emit('notification', event);
  }

  /**
   * Emit a bulk notification event
   */
  emitBulkNotification(event: BulkNotificationEvent): void {
    logger.info(
      `Emitting bulk notification event: ${event.type} for ${event.recipients.length} recipients`
    );
    this.emit('bulk-notification', event);
  }

  /**
   * Convenience methods for common notification types
   */
  async sendWelcomeNotification(recipientId: string, data?: Record<string, any>): Promise<void> {
    this.emitNotification({
      type: 'welcome',
      recipientId,
      data: data || {},
    });
  }

  async sendPaymentReminder(
    recipientId: string,
    data: {
      amount: number;
      dueDate: string;
      invoiceNumber: string;
    }
  ): Promise<void> {
    this.emitNotification({
      type: 'payment_reminder',
      recipientId,
      data,
      priority: NotificationPriority.HIGH,
    });
  }

  async sendPaymentSuccess(
    recipientId: string,
    data: {
      amount: number;
      transactionId: string;
      paymentMethod: string;
    }
  ): Promise<void> {
    this.emitNotification({
      type: 'payment_success',
      recipientId,
      data,
    });
  }

  async sendSystemMaintenance(
    recipients: string[],
    data: {
      maintenanceDate: string;
      estimatedDuration: string;
      affectedServices: string[];
    }
  ): Promise<void> {
    this.emitBulkNotification({
      type: 'system_maintenance',
      recipients: recipients.map(id => ({
        recipientId: id,
        recipientEmail: '',
        recipientPhone: '',
      })),
      channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      data,
      priority: NotificationPriority.HIGH,
    });
  }

  private setupEventListeners(): void {
    this.on('notification', async (event: NotificationEvent) => {
      try {
        await this.notificationHandler.handleNotificationEvent(event);
      } catch (error) {
        logger.error('Error processing notification event:', error);
      }
    });

    this.on('bulk-notification', async (event: BulkNotificationEvent) => {
      try {
        await this.notificationHandler.handleBulkNotificationEvent(event);
      } catch (error) {
        logger.error('Error processing bulk notification event:', error);
      }
    });

    this.on('error', (error: Error) => {
      logger.error('Notification emitter error:', error);
    });
  }
}
