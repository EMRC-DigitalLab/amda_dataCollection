// Fixed src/modules/notifications/services/notification.service.ts
import { Repository, In } from 'typeorm';
import { AppDataSource } from '@/config/database';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
} from '@/database/entities/notification.entity';
// import { NotificationTemplate } from '@/database/entities/notification-template.entity';
import { NotificationPreference } from '@/database/entities/notification-preference.entity';
import {
  NotificationRequest,
  //   NotificationEvent,
  BulkNotificationEvent,
  //   INotificationChannel,
} from '../interfaces/notification.interface';
import { TemplateService } from './template.service';
import { NotificationChannelFactory } from './channel-factory.service';
import { NotificationQueueService } from './notification-queue.service';
import { WebSocketNotificationService } from './websocket-notification.service';
import { logger } from '@/shared/utils/logger';

export class NotificationService {
  private notificationRepository: Repository<Notification>;
  private preferenceRepository: Repository<NotificationPreference>;

  constructor(
    private templateService: TemplateService,
    private channelFactory: NotificationChannelFactory,
    private queueService: NotificationQueueService,
    private webSocketNotificationService?: WebSocketNotificationService
  ) {
    this.notificationRepository = AppDataSource.getRepository(Notification);
    this.preferenceRepository = AppDataSource.getRepository(NotificationPreference);
  }

  /**
   * Send a single notification
   */
  async sendNotification(request: NotificationRequest): Promise<Notification> {
    try {
      // Create notification record
      const notification = await this.createNotificationRecord(request);

      // Check user preferences
      const shouldSend = await this.checkUserPreferences(
        request.recipientId,
        request.type,
        request.channel
      );

      if (!shouldSend) {
        logger.info(`Notification blocked by user preferences: ${notification.id}`);
        notification.status = NotificationStatus.CANCELLED;
        await this.notificationRepository.save(notification);
        return notification;
      }

      // Queue for immediate or scheduled delivery
      if (request.scheduledAt && request.scheduledAt > new Date()) {
        await this.queueService.scheduleNotification(notification);
        notification.status = NotificationStatus.PENDING;
      } else {
        await this.queueService.queueNotification(notification);
        notification.status = NotificationStatus.PROCESSING;
      }

      await this.notificationRepository.save(notification);
      logger.info(`Notification queued: ${notification.id}`);

      // Send real-time notification
      if (this.webSocketNotificationService) {
        await this.webSocketNotificationService.onNotificationCreated(notification);
      }

      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(event: BulkNotificationEvent): Promise<Notification[]> {
    const notifications: Notification[] = [];

    try {
      for (const recipient of event.recipients) {
        const channels = Array.isArray(event.channel) ? event.channel : [event.channel];

        for (const channel of channels) {
          const request: NotificationRequest = {
            type: event.type,
            channel,
            recipientId: recipient.recipientId,
            recipientEmail: recipient.recipientEmail,
            recipientPhone: recipient.recipientPhone,
            subject: '', // Will be populated by template
            content: '', // Will be populated by template
            templateData: { ...event.data, ...recipient.customData },
            priority: event.priority || NotificationPriority.NORMAL,
            scheduledAt: event.scheduledAt,
          };

          const notification = await this.sendNotification(request);
          notifications.push(notification);
        }
      }

      // Send bulk real-time notifications
      if (this.webSocketNotificationService) {
        await this.webSocketNotificationService.onBulkNotificationCreated(notifications);
      }

      logger.info(`Bulk notification created: ${notifications.length} notifications`);
      return notifications;
    } catch (error) {
      logger.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId: userId, isDeleted: false },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();

    const updatedNotification = await this.notificationRepository.save(notification);

    // Send real-time update
    if (this.webSocketNotificationService) {
      await this.webSocketNotificationService.onNotificationUpdated(updatedNotification, 'read');
    }

    return updatedNotification;
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId: userId, isDeleted: false },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = false;
    notification.readAt = undefined;

    const updatedNotification = await this.notificationRepository.save(notification);

    // Send real-time update
    if (this.webSocketNotificationService) {
      await this.webSocketNotificationService.onNotificationUpdated(updatedNotification, 'read');
    }

    return updatedNotification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { recipientId: userId, isRead: false, isDeleted: false },
      { isRead: true, readAt: new Date() }
    );

    return { affected: result.affected || 0 };
  }

  /**
   * Soft delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId: userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isDeleted = true;
    notification.deletedAt = new Date();

    const updatedNotification = await this.notificationRepository.save(notification);

    // Send real-time update
    if (this.webSocketNotificationService) {
      await this.webSocketNotificationService.onNotificationUpdated(updatedNotification, 'deleted');
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteNotifications(
    notificationIds: string[],
    userId: string
  ): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { id: In(notificationIds), recipientId: userId },
      { isDeleted: true, deletedAt: new Date() }
    );

    return { affected: result.affected || 0 };
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId: userId, isDeleted: false },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isArchived = true;
    notification.archivedAt = new Date();

    const updatedNotification = await this.notificationRepository.save(notification);

    // Send real-time update
    if (this.webSocketNotificationService) {
      await this.webSocketNotificationService.onNotificationUpdated(
        updatedNotification,
        'archived'
      );
    }

    return updatedNotification;
  }

  /**
   * Unarchive notification
   */
  async unarchiveNotification(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId: userId, isDeleted: false },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isArchived = false;
    notification.archivedAt = undefined;

    const updatedNotification = await this.notificationRepository.save(notification);

    // Send real-time update
    if (this.webSocketNotificationService) {
      await this.webSocketNotificationService.onNotificationUpdated(
        updatedNotification,
        'archived'
      );
    }

    return updatedNotification;
  }

  // ... rest of existing methods (processNotification, getNotifications, etc.) remain the same

  /**
   * Process a notification (called by queue worker)
   */
  async processNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['template'],
    });

    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    try {
      // Render template if needed
      if (notification.templateId && !notification.content) {
        const rendered = await this.templateService.renderTemplate({
          templateId: notification.templateId,
          channel: notification.channel,
          data: notification.templateData || {},
          recipientId: notification.recipientId,
        });

        notification.subject = rendered.subject;
        notification.content = rendered.content;
        if (rendered.htmlContent) {
          notification.metadata = {
            ...notification.metadata,
            htmlContent: rendered.htmlContent,
          };
        }
      }

      // Get channel implementation
      const channel = this.channelFactory.getChannel(notification.channel);

      // Send notification
      const result = await channel.send({
        id: notification.id,
        type: notification.type,
        channel: notification.channel,
        recipientId: notification.recipientId,
        recipientEmail: notification.recipientEmail,
        recipientPhone: notification.recipientPhone,
        subject: notification.subject,
        content: notification.content,
        htmlContent: notification.metadata?.htmlContent,
        templateData: notification.templateData,
        metadata: notification.metadata,
        priority: notification.priority,
      });

      // Update notification status
      if (result.success) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
        if (result.providerId) {
          notification.metadata = {
            ...notification.metadata,
            providerId: result.providerId,
            providerMessageId: result.providerMessageId,
          };
        }
      } else {
        notification.status = NotificationStatus.FAILED;
        notification.errorMessage = result.errorMessage;
        notification.errorDetails = result.errorDetails;

        // Schedule retry if within retry limits
        if (notification.retryCount < notification.maxRetries) {
          await this.scheduleRetry(notification);
        }
      }

      await this.notificationRepository.save(notification);
      logger.info(`Notification processed: ${notificationId}, Status: ${notification.status}`);
    } catch (error: any) {
      logger.error(`Error processing notification ${notificationId}:`, error);

      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      notification.retryCount += 1;

      if (notification.retryCount < notification.maxRetries) {
        await this.scheduleRetry(notification);
      }

      await this.notificationRepository.save(notification);
      throw error;
    }
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(filters: {
    recipientId?: string;
    type?: string;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    page?: number;
    limit?: number;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (filters.recipientId) {
      queryBuilder.andWhere('notification.recipientId = :recipientId', {
        recipientId: filters.recipientId,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('notification.type = :type', { type: filters.type });
    }

    if (filters.channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel: filters.channel });
    }

    if (filters.status) {
      queryBuilder.andWhere('notification.status = :status', { status: filters.status });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const [notifications, total] = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { notifications, total };
  }

  /**
   * Update notification preferences
   */
  async updatePreference(
    userId: string,
    type: string,
    channel: NotificationChannel,
    enabled: boolean,
    settings?: Record<string, any>
  ): Promise<NotificationPreference> {
    let preference = await this.preferenceRepository.findOne({
      where: { userId, type, channel },
    });

    if (!preference) {
      preference = this.preferenceRepository.create({
        userId,
        type,
        channel,
        enabled,
        settings,
      });
    } else {
      preference.enabled = enabled;
      if (settings) {
        preference.settings = { ...preference.settings, ...settings };
      }
    }

    return await this.preferenceRepository.save(preference);
  }

  /**
   * Get user notifications with management filters
   */
  async getUserNotifications(
    userId: string,
    filters: {
      isRead?: boolean;
      isArchived?: boolean;
      type?: string;
      channel?: NotificationChannel;
      page?: number;
      limit?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.recipientId = :userId', { userId })
      .andWhere('notification.isDeleted = :isDeleted', { isDeleted: false });

    if (filters.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: filters.isRead });
    }

    if (filters.isArchived !== undefined) {
      queryBuilder.andWhere('notification.isArchived = :isArchived', {
        isArchived: filters.isArchived,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('notification.type = :type', { type: filters.type });
    }

    if (filters.channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel: filters.channel });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const [notifications, total] = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    // Get unread count
    const unreadCount = await this.notificationRepository.count({
      where: {
        recipientId: userId,
        isRead: false,
        isDeleted: false,
      },
    });

    return { notifications, total, unreadCount };
  }

  /**
   * Get notification stats for user
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    archived: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const baseQuery = { recipientId: userId, isDeleted: false };

    const [total, unread, archived] = await Promise.all([
      this.notificationRepository.count({ where: baseQuery }),
      this.notificationRepository.count({ where: { ...baseQuery, isRead: false } }),
      this.notificationRepository.count({ where: { ...baseQuery, isArchived: true } }),
    ]);

    // Get counts by channel
    const channelStats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.channel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .where('notification.recipientId = :userId', { userId })
      .andWhere('notification.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('notification.channel')
      .getRawMany();

    const byChannel = channelStats.reduce((acc, stat) => {
      acc[stat.channel] = parseInt(stat.count);
      return acc;
    }, {});

    // Get counts by type
    const typeStats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.recipientId = :userId', { userId })
      .andWhere('notification.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('notification.type')
      .getRawMany();

    const byType = typeStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {});

    return { total, unread, archived, byChannel, byType };
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return await this.preferenceRepository.find({
      where: { userId },
    });
  }

  private async createNotificationRecord(request: NotificationRequest): Promise<Notification> {
    const notification = this.notificationRepository.create({
      type: request.type,
      channel: request.channel,
      recipientId: request.recipientId,
      recipientEmail: request.recipientEmail,
      recipientPhone: request.recipientPhone,
      subject: request.subject,
      content: request.content,
      templateId: request.templateId,
      templateData: request.templateData,
      metadata: request.metadata,
      priority: request.priority || NotificationPriority.NORMAL,
      scheduledAt: request.scheduledAt,
      maxRetries: request.maxRetries || 3,
      status: NotificationStatus.PENDING,
    });

    return await this.notificationRepository.save(notification);
  }

  private async checkUserPreferences(
    userId: string,
    type: string,
    channel: NotificationChannel
  ): Promise<boolean> {
    const preference = await this.preferenceRepository.findOne({
      where: { userId, type, channel },
    });

    // If no preference exists, default to enabled
    return preference?.enabled !== false;
  }

  private async scheduleRetry(notification: Notification): Promise<void> {
    // Exponential backoff: 1min, 5min, 15min
    const delayMinutes = Math.pow(3, notification.retryCount);
    const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    notification.nextRetryAt = nextRetryAt;
    notification.retryCount += 1;

    await this.queueService.scheduleNotificationRetry(notification);
    logger.info(`Scheduled retry for notification ${notification.id} at ${nextRetryAt}`);
  }
}
