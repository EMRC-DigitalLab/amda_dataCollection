// src/modules/notifications/controllers/notification.controller.ts
import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { NotificationService } from '../services/notification.service';
import { NotificationQueueService } from '../services/notification-queue.service';
import {
  CreateNotificationDto,
  BulkNotificationDto,
  NotificationQueryDto,
  UpdateNotificationPreferenceDto,
  UserNotificationQueryDto,
  MarkNotificationsDto,
} from '../dtos/notification.dto';
import { logger } from '@/shared/utils/logger';

export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private queueService: NotificationQueueService
  ) {}

  /**
   * Create and send a single notification
   */
  async createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createDto = plainToClass(CreateNotificationDto, req.body);
      const errors = await validate(createDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints,
          })),
        });
        return;
      }

      const notification = await this.notificationService.sendNotification(createDto);

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification,
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      next(error);
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bulkDto = plainToClass(BulkNotificationDto, req.body);
      const errors = await validate(bulkDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints,
          })),
        });
        return;
      }

      const notifications = await this.notificationService.sendBulkNotification(bulkDto);

      res.status(201).json({
        success: true,
        message: 'Bulk notifications created successfully',
        data: {
          totalCreated: notifications.length,
          notifications: notifications.slice(0, 10), // Return first 10 for preview
        },
      });
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      next(error);
    }
  }

  /**
   * Get notifications with filters and pagination
   */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryDto = plainToClass(NotificationQueryDto, req.query);
      const errors = await validate(queryDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints,
          })),
        });
        return;
      }

      const page = parseInt(queryDto.page || '1');
      const limit = parseInt(queryDto.limit || '20');

      const result = await this.notificationService.getNotifications({
        recipientId: queryDto.recipientId,
        type: queryDto.type,
        channel: queryDto.channel as any,
        status: queryDto.status as any,
        page,
        limit,
      });

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      next(error);
    }
  }

  /**
   * Get single notification by ID
   */
  async getNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.notificationService.getNotifications({ page: 1, limit: 1 });
      const notification = result.notifications.find(n => n.id === id);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      logger.error('Error fetching notification:', error);
      next(error);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const updateDto = plainToClass(UpdateNotificationPreferenceDto, req.body);
      const errors = await validate(updateDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints,
          })),
        });
        return;
      }

      const preference = await this.notificationService.updatePreference(
        userId,
        updateDto.type,
        updateDto.channel,
        updateDto.enabled ?? true,
        updateDto.settings
      );

      res.json({
        success: true,
        message: 'Preference updated successfully',
        data: preference,
      });
    } catch (error) {
      logger.error('Error updating preference:', error);
      next(error);
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const preferences = await this.notificationService.getPreferences(userId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Error fetching preferences:', error);
      next(error);
    }
  }

  /**
   * Get user notifications with management features
   */
  async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const queryDto = plainToClass(UserNotificationQueryDto, req.query);
      const errors = await validate(queryDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints,
          })),
        });
        return;
      }

      const page = parseInt(queryDto.page || '1');
      const limit = parseInt(queryDto.limit || '20');

      const result = await this.notificationService.getUserNotifications(userId, {
        isRead: queryDto.isRead ? queryDto.isRead === 'true' : undefined,
        isArchived: queryDto.isArchived ? queryDto.isArchived === 'true' : undefined,
        type: queryDto.type,
        channel: queryDto.channel,
        page,
        limit,
      });

      res.json({
        success: true,
        data: {
          notifications: result.notifications,
          unreadCount: result.unreadCount,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      next(error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, notificationId } = req.params;
      const notification = await this.notificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      next(error);
    }
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, notificationId } = req.params;
      const notification = await this.notificationService.markAsUnread(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as unread',
        data: notification,
      });
    } catch (error) {
      logger.error('Error marking notification as unread:', error);
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await this.notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: { affected: result.affected },
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      next(error);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, notificationId } = req.params;
      await this.notificationService.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      next(error);
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const deleteDto = plainToClass(MarkNotificationsDto, req.body);
      const errors = await validate(deleteDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(err => ({
            property: err.property,
            constraints: err.constraints,
          })),
        });
        return;
      }

      const result = await this.notificationService.deleteNotifications(
        deleteDto.notificationIds,
        userId
      );

      res.json({
        success: true,
        message: 'Notifications deleted successfully',
        data: { affected: result.affected },
      });
    } catch (error) {
      logger.error('Error deleting notifications:', error);
      next(error);
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, notificationId } = req.params;
      const notification = await this.notificationService.archiveNotification(
        notificationId,
        userId
      );

      res.json({
        success: true,
        message: 'Notification archived successfully',
        data: notification,
      });
    } catch (error) {
      logger.error('Error archiving notification:', error);
      next(error);
    }
  }

  /**
   * Unarchive notification
   */
  async unarchiveNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, notificationId } = req.params;
      const notification = await this.notificationService.unarchiveNotification(
        notificationId,
        userId
      );

      res.json({
        success: true,
        message: 'Notification unarchived successfully',
        data: notification,
      });
    } catch (error) {
      logger.error('Error unarchiving notification:', error);
      next(error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const stats = await this.notificationService.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching notification stats:', error);
      next(error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.queueService.getQueueStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching queue stats:', error);
      next(error);
    }
  }
}
// Example: Integration in a payment service
// src/modules/payments/services/payment.service.ts (example)
/*
import { NotificationHelper } from '@/shared/utils/notification-helper';

export class PaymentService {
  async processPayment(paymentData: any): Promise<void> {
    try {
      // Process payment logic...
      
      // Send success notification
      await NotificationHelper.sendCustomNotification(
        paymentData.userId,
        'payment_success',
        {
          amount: paymentData.amount,
          transactionId: paymentData.transactionId,
          paymentMethod: paymentData.method,
        }
      );
      
    } catch (error) {
      // Send failure notification
      await NotificationHelper.sendCustomNotification(
        paymentData.userId,
        'payment_failed',
        {
          amount: paymentData.amount,
          errorMessage: error.message,
          supportUrl: 'https://support.amda.com',
        },
        { priority: NotificationPriority.HIGH }
      );
    }
  }
}
*/

// Database migration to create notification tables
// src/database/migrations/001-create-notification-tables.ts
/*
import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateNotificationTables1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notifications table
    await queryRunner.createTable(new Table({
      name: 'notifications',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
        { name: 'type', type: 'varchar', length: '255' },
        { name: 'channel', type: 'enum', enum: ['email', 'sms', 'push', 'webhook', 'in_app'] },
        { name: 'status', type: 'enum', enum: ['pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled'], default: "'pending'" },
        { name: 'priority', type: 'enum', enum: ['low', 'normal', 'high', 'urgent'], default: "'normal'" },
        { name: 'recipientId', type: 'uuid' },
        { name: 'recipientEmail', type: 'varchar', length: '255' },
        { name: 'recipientPhone', type: 'varchar', length: '20', isNullable: true },
        { name: 'subject', type: 'varchar', length: '500' },
        { name: 'content', type: 'text' },
        { name: 'metadata', type: 'jsonb', isNullable: true },
        { name: 'templateData', type: 'jsonb', isNullable: true },
        { name: 'templateId', type: 'uuid', isNullable: true },
        { name: 'scheduledAt', type: 'timestamp', isNullable: true },
        { name: 'sentAt', type: 'timestamp', isNullable: true },
        { name: 'deliveredAt', type: 'timestamp', isNullable: true },
        { name: 'retryCount', type: 'int', default: 0 },
        { name: 'maxRetries', type: 'int', default: 3 },
        { name: 'nextRetryAt', type: 'timestamp', isNullable: true },
        { name: 'errorMessage', type: 'text', isNullable: true },
        { name: 'errorDetails', type: 'jsonb', isNullable: true },
        { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }));

    // Create other notification tables...
    // (notification_templates, notification_deliveries, notification_preferences)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
    // Drop other tables...
  }
}
*/ 2;
