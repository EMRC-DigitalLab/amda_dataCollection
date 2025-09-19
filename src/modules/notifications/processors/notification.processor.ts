// src/jobs/notifications/processors/notification.processor.ts
import { Job, DoneCallback } from 'bull';
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { TemplateService } from '@/modules/notifications/services/template.service';
import { NotificationChannelFactory } from '@/modules/notifications/services/channel-factory.service';
import { NotificationQueueService } from '@/modules/notifications/services/notification-queue.service';
import { EmailChannel } from '@/modules/notifications/channels/email.channel';
import { SmsChannel } from '@/modules/notifications/channels/sms.channel';
import { PushChannel } from '@/modules/notifications/channels/push.channel';
import { WebhookChannel } from '@/modules/notifications/channels/webhook.channel';
import { InAppChannel } from '@/modules/notifications/channels/in-app.channel';
import { logger } from '@/shared/utils/logger';

// Initialize services for job processor
const templateService = new TemplateService();
const queueService = new NotificationQueueService();

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

const notificationService = new NotificationService(templateService, channelFactory, queueService);

export async function processNotification(job: Job, done: DoneCallback): Promise<void> {
  try {
    const { notificationId } = job.data;

    logger.info(`Processing notification job: ${job.id}, Notification: ${notificationId}`);

    await notificationService.processNotification(notificationId);

    logger.info(`Notification job completed: ${job.id}`);
    done();
  } catch (error: any) {
    logger.error(`Notification job failed: ${job.id}`, error);
    done(error);
  }
}
