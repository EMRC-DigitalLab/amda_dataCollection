// src/modules/notifications/routes/notification.routes.ts
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { adminMiddleware } from '@/shared/middleware/admin.middleware';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { NotificationQueueService } from '../services/notification-queue.service';
import { TemplateService } from '../services/template.service';
import { NotificationChannelFactory } from '../services/channel-factory.service';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';
import { PushChannel } from '../channels/push.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import { InAppChannel } from '../channels/in-app.channel';
import { createTimelineRoutes } from './timeline.routes';

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

  // TEST ROUTES - Remove in production
  router.post('/test/email', async (req, res) => {
    try {
      const { recipientEmail, subject, content } = req.body;

      // Test direct email channel
      const emailChannel = new EmailChannel();
      const result = await emailChannel.send({
        id: 'test-' + Date.now(),
        type: 'test',
        channel: NotificationChannel.EMAIL,
        recipientId: 'test-user',
        recipientEmail: recipientEmail,
        subject: subject || 'Test Email Notification',
        content: content || 'This is a test email from your notification system.',
      });

      res.json({
        success: true,
        message: 'Email test completed',
        result: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  router.post('/test/full-pipeline', async (req, res) => {
    try {
      const {
        recipientId = 'test-user-123',
        recipientEmail,
        type = 'test_notification',
        subject = 'Test Pipeline Notification',
        content = 'Testing the full notification pipeline',
      } = req.body;

      // Test full notification pipeline
      const notification = await notificationService.sendNotification({
        type,
        channel: NotificationChannel.EMAIL,
        recipientId,
        recipientEmail,
        subject,
        content,
        priority: NotificationPriority.NORMAL,
      });

      res.json({
        success: true,
        message: 'Full pipeline test initiated',
        notification: {
          id: notification.id,
          status: notification.status,
          type: notification.type,
          channel: notification.channel,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  router.post('/test/in-app', async (req, res) => {
    try {
      const {
        recipientId = 'test-user-123',
        subject = 'Test In-App Notification',
        content = 'This is a test in-app notification',
      } = req.body;

      // Test in-app notification
      const notification = await notificationService.sendNotification({
        type: 'test_in_app',
        channel: NotificationChannel.IN_APP,
        recipientId,
        recipientEmail: 'test@example.com',
        subject,
        content,
        priority: NotificationPriority.NORMAL,
      });

      res.json({
        success: true,
        message: 'In-app notification test completed',
        notification: {
          id: notification.id,
          status: notification.status,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  router.post('/test/template', async (req, res) => {
    try {
      // First create a test template
      const template = await templateService.createTemplate({
        name: 'test_welcome',
        type: 'welcome',
        channel: NotificationChannel.EMAIL,
        subject: 'Welcome {{userName}}!',
        content: 'Hello {{userName}}, welcome to {{appName}}! Your account is ready.',
        htmlContent:
          '<h1>Welcome {{userName}}!</h1><p>Hello {{userName}}, welcome to <strong>{{appName}}</strong>! Your account is ready.</p>',
        variables: ['userName', 'appName'],
      });

      // Test template rendering
      const rendered = await templateService.renderTemplate({
        templateId: template.id,
        channel: NotificationChannel.EMAIL,
        data: {
          userName: req.body.userName || 'John Doe',
          appName: 'AMDA Platform',
        },
      });

      res.json({
        success: true,
        message: 'Template test completed',
        template: {
          id: template.id,
          name: template.name,
        },
        rendered: rendered,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  router.get('/test/queue-stats', async (req, res) => {
    try {
      const stats = await queueService.getQueueStats();
      res.json({
        success: true,
        message: 'Queue statistics retrieved',
        stats: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Timeline notification routes
  router.use('/timeline', createTimelineRoutes(_dataSource));

  return router;
}
