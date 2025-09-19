// src/modules/notifications/routes/notification.routes.ts
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { adminMiddleware } from '@/shared/middleware/admin.middleware';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { NotificationQueueService } from '../services/notification-queue.service';
import { TemplateService } from '../services/template.service';
import { NotificationChannelFactory } from '../services/channel-factory.service';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';
import { PushChannel } from '../channels/push.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import { InAppChannel } from '../channels/in-app.channel';

export function createNotificationRoutes(_dataSource: DataSource): Router {
  const router = Router();

  // Initialize services
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

  // Initialize notification service
  const notificationService = new NotificationService(
    templateService,
    channelFactory,
    queueService
  );

  // Initialize controller
  const notificationController = new NotificationController(notificationService, queueService);

  // Admin-only notification management routes
  router.post('/', authMiddleware, adminMiddleware, (req, res, next) =>
    notificationController.createNotification(req, res, next)
  );

  router.post('/bulk', authMiddleware, adminMiddleware, (req, res, next) =>
    notificationController.sendBulkNotifications(req, res, next)
  );

  router.get('/', authMiddleware, adminMiddleware, (req, res, next) =>
    notificationController.getNotifications(req, res, next)
  );

  router.get('/queue/stats', authMiddleware, adminMiddleware, (req, res, next) =>
    notificationController.getQueueStats(req, res, next)
  );

  router.get('/:id', authMiddleware, (req, res, next) =>
    notificationController.getNotification(req, res, next)
  );

  // User notification management routes (authenticated users can manage their own)
  router.get('/users/:userId/notifications', authMiddleware, (req, res, next) =>
    notificationController.getUserNotifications(req, res, next)
  );

  router.get('/users/:userId/notifications/stats', authMiddleware, (req, res, next) =>
    notificationController.getNotificationStats(req, res, next)
  );

  router.patch(
    '/users/:userId/notifications/:notificationId/read',
    authMiddleware,
    (req, res, next) => notificationController.markAsRead(req, res, next)
  );

  router.patch(
    '/users/:userId/notifications/:notificationId/unread',
    authMiddleware,
    (req, res, next) => notificationController.markAsUnread(req, res, next)
  );

  router.patch('/users/:userId/notifications/read-all', authMiddleware, (req, res, next) =>
    notificationController.markAllAsRead(req, res, next)
  );

  router.delete('/users/:userId/notifications/:notificationId', authMiddleware, (req, res, next) =>
    notificationController.deleteNotification(req, res, next)
  );

  router.delete('/users/:userId/notifications', authMiddleware, (req, res, next) =>
    notificationController.deleteNotifications(req, res, next)
  );

  router.patch(
    '/users/:userId/notifications/:notificationId/archive',
    authMiddleware,
    (req, res, next) => notificationController.archiveNotification(req, res, next)
  );

  router.patch(
    '/users/:userId/notifications/:notificationId/unarchive',
    authMiddleware,
    (req, res, next) => notificationController.unarchiveNotification(req, res, next)
  );

  // User preference routes (authenticated users can manage their own preferences)
  router.put('/users/:userId/preferences', authMiddleware, (req, res, next) =>
    notificationController.updatePreference(req, res, next)
  );

  router.get('/users/:userId/preferences', authMiddleware, (req, res, next) =>
    notificationController.getPreferences(req, res, next)
  );

  return router;
}
