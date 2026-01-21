// src/modules/notifications/services/notification-queue.service.ts
import { Notification, NotificationPriority } from '@/database/entities/notification.entity';
import { logger } from '@/shared/utils/logger';
import Queue, { Job } from 'bull';

import { config } from '@/config';

export class NotificationQueueService {
  private notificationQueue: Queue.Queue;

  constructor() {
    this.notificationQueue = new Queue('notification processing', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
         connectTimeout: 30000,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    this.notificationQueue.on('error', (error) => {
      logger.error('Notification Queue Redis Connection Error:', error);
    });

    this.notificationQueue.on('active', () => {
      logger.info('Notification Queue: Worker is active and processing');
    });

    this.notificationQueue.client.on('ready', () => {
      logger.info(`Notification Queue Redis Client Ready (Host: ${config.redis.host})`);
    });

    this.notificationQueue.client.on('error', (err) => {
      logger.error('Notification Queue Redis Client Error:', err);
    });

    this.setupProcessors();
  }

  async queueNotification(notification: Notification): Promise<Job> {
    const priority = this.getPriorityValue(notification.priority);

    const job = await this.notificationQueue.add(
      'process-notification',
      { notificationId: notification.id },
      {
        priority,
        delay: 0,
        attempts: notification.maxRetries,
      }
    );

    logger.info(`Notification queued: ${notification.id}, Job: ${job.id}`);
    return job;
  }

  async scheduleNotification(notification: Notification): Promise<Job> {
    const delay = notification.scheduledAt ? notification.scheduledAt.getTime() - Date.now() : 0;

    const job = await this.notificationQueue.add(
      'process-notification',
      { notificationId: notification.id },
      {
        delay: Math.max(0, delay),
        attempts: notification.maxRetries,
      }
    );

    logger.info(`Notification scheduled: ${notification.id}, Delay: ${delay}ms`);
    return job;
  }

  async scheduleNotificationRetry(notification: Notification): Promise<Job> {
    const delay = notification.nextRetryAt
      ? notification.nextRetryAt.getTime() - Date.now()
      : 60000; // Default 1 minute

    const job = await this.notificationQueue.add(
      'process-notification',
      { notificationId: notification.id },
      {
        delay: Math.max(0, delay),
        attempts: 1, // Single attempt for retry
      }
    );

    logger.info(`Notification retry scheduled: ${notification.id}`);
    return job;
  }

  async queueBulkNotifications(notificationIds: string[]): Promise<Job[]> {
    const jobs = await Promise.all(
      notificationIds.map(id =>
        this.notificationQueue.add(
          'process-notification',
          { notificationId: id },
          { priority: this.getPriorityValue(NotificationPriority.NORMAL) }
        )
      )
    );

    logger.info(`Bulk notifications queued: ${jobs.length} jobs`);
    return jobs;
  }

  /**
   * Schedule periodic admin summary notification
   * Run daily at 9:00 AM
   */
  async schedulePeriodicAdminNotification(): Promise<Job> {
    // Remove existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await this.notificationQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'process-admin-notification') {
        await this.notificationQueue.removeRepeatableByKey(job.key);
      }
    }

    const job = await this.notificationQueue.add(
      'process-admin-notification',
      {},
      {
        repeat: { cron: '0 9 * * *' }, // Daily at 9:00 AM
        attempts: 1,
      }
    );

    logger.info(`Periodic admin notification scheduled: ${job.id}`);
    return job;
  }

  private setupProcessors(): void {
    this.notificationQueue.process('process-notification', async (job: Job) => {
      const { notificationId } = job.data;
      logger.info(`Processing notification job: ${job.id}, Notification: ${notificationId}`);

      // Import services dynamically to avoid circular dependency
      const { NotificationService } = await import('./notification.service');
      const { TemplateService } = await import('./template.service');
      const { NotificationChannelFactory } = await import('./channel-factory.service');
      const { WebSocketNotificationService } = await import('./websocket-notification.service');
      const { EmailChannel } = await import('../channels/email.channel');
      const { SmsChannel } = await import('../channels/sms.channel');
      const { PushChannel } = await import('../channels/push.channel');
      const { WebhookChannel } = await import('../channels/webhook.channel');
      const { InAppChannel } = await import('../channels/in-app.channel');

      // Create channel instances
      const templateService = new TemplateService();
      const emailChannel = new EmailChannel();
      const smsChannel = new SmsChannel();
      const pushChannel = new PushChannel();
      const webhookChannel = new WebhookChannel();
      const inAppChannel = new InAppChannel();

      const channelFactory = new NotificationChannelFactory(
        emailChannel,
        smsChannel,
        pushChannel,
        webhookChannel,
        inAppChannel
      );

      // Get WebSocket service from global (if available)
      const webSocketService = (global as any).webSocketService;

      // Create WebSocketNotificationService ONLY if WebSocket service exists
      const webSocketNotificationService = webSocketService
        ? new WebSocketNotificationService(webSocketService)
        : undefined;

      if (!webSocketNotificationService) {
        logger.warn(
          'WebSocket service not available in queue processor - real-time notifications disabled'
        );
      }

      // Create NotificationService with WebSocket support
      const notificationService = new NotificationService(
        templateService,
        channelFactory,
        this,
        webSocketNotificationService
      );

      await notificationService.processNotification(notificationId);
    });

    this.notificationQueue.process('process-admin-notification', async (job: Job) => {
      logger.info(`Processing admin notification job: ${job.id}`);

      // Import services dynamically to avoid circular dependency
      const { NotificationService } = await import('./notification.service');
      const { TemplateService } = await import('./template.service');
      const { NotificationChannelFactory } = await import('./channel-factory.service');
      const { EmailChannel } = await import('../channels/email.channel');
      const { SmsChannel } = await import('../channels/sms.channel');
      const { PushChannel } = await import('../channels/push.channel');
      const { WebhookChannel } = await import('../channels/webhook.channel');
      const { InAppChannel } = await import('../channels/in-app.channel');

      // Create channel instances - simplified instantiation for this processor
      const templateService = new TemplateService();
      const channelFactory = new NotificationChannelFactory(
        new EmailChannel(),
        new SmsChannel(),
        new PushChannel(),
        new WebhookChannel(),
        new InAppChannel()
      );

      // Create NotificationService
      const notificationService = new NotificationService(
        templateService,
        channelFactory,
        this
      );

      await notificationService.sendAdminSummaryNotification();
    });

    // Event listeners
    this.notificationQueue.on('completed', (job: Job) => {
      logger.info(`Notification job completed: ${job.id}`);
    });

    this.notificationQueue.on('failed', (job: Job, err: Error) => {
      logger.error(`Notification job failed: ${job.id}`, err);
    });

    this.notificationQueue.on('stalled', (job: Job) => {
      logger.warn(`Notification job stalled: ${job.id}`);
    });
  }

  private getPriorityValue(priority: NotificationPriority): number {
    const priorities = {
      [NotificationPriority.LOW]: 10,
      [NotificationPriority.NORMAL]: 5,
      [NotificationPriority.HIGH]: 2,
      [NotificationPriority.URGENT]: 1,
    };
    return priorities[priority] || 5;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    return {
      waiting: await this.notificationQueue.getWaiting().then(jobs => jobs.length),
      active: await this.notificationQueue.getActive().then(jobs => jobs.length),
      completed: await this.notificationQueue.getCompleted().then(jobs => jobs.length),
      failed: await this.notificationQueue.getFailed().then(jobs => jobs.length),
    };
  }
}
