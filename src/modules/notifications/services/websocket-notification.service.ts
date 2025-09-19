// src/modules/notifications/services/websocket-notification.service.ts
import { WebSocketService } from '@/shared/websocket/websocket.service';
import { Notification } from '@/database/entities/notification.entity';
import { logger } from '@/shared/utils/logger';

export class WebSocketNotificationService {
  constructor(private webSocketService: WebSocketService) {}

  /**
   * Send real-time notification when a new notification is created
   */
  async onNotificationCreated(notification: Notification): Promise<void> {
    try {
      const sent = await this.webSocketService.sendNotificationToUser(notification.recipientId, {
        id: notification.id,
        type: notification.type,
        subject: notification.subject,
        content: notification.content,
        priority: notification.priority,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      });

      if (sent) {
        logger.info(`Real-time notification delivered: ${notification.id}`);
      }
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
    }
  }

  /**
   * Send real-time updates when notification status changes
   */
  async onNotificationUpdated(
    notification: Notification,
    action: 'read' | 'deleted' | 'archived'
  ): Promise<void> {
    try {
      await this.webSocketService.sendNotificationUpdate(notification.recipientId, {
        notificationId: notification.id,
        status: notification.status,
        action,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Error sending notification update:', error);
    }
  }

  /**
   * Send bulk real-time notifications
   */
  async onBulkNotificationCreated(notifications: Notification[]): Promise<void> {
    try {
      // Group notifications by content (same notification sent to multiple users)
      const notificationGroups = new Map<
        string,
        { notification: Notification; userIds: string[] }
      >();

      notifications.forEach(notification => {
        const key = `${notification.type}-${notification.subject}`;

        if (!notificationGroups.has(key)) {
          notificationGroups.set(key, {
            notification,
            userIds: [notification.recipientId],
          });
        } else {
          notificationGroups.get(key)!.userIds.push(notification.recipientId);
        }
      });

      // Send each group as a bulk notification
      for (const [, group] of notificationGroups) {
        await this.webSocketService.sendNotificationToUsers(group.userIds, {
          id: group.notification.id,
          type: group.notification.type,
          subject: group.notification.subject,
          content: group.notification.content,
          priority: group.notification.priority,
          createdAt: group.notification.createdAt,
          metadata: group.notification.metadata,
        });
      }
    } catch (error) {
      logger.error('Error sending bulk real-time notifications:', error);
    }
  }
}
