// src/modules/notifications/services/channel-factory.service.ts
import { NotificationChannel } from '@/database/entities/notification.entity';
import { INotificationChannel } from '../interfaces/notification.interface';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';
import { PushChannel } from '../channels/push.channel';
import { WebhookChannel } from '../channels/webhook.channel';
import { InAppChannel } from '../channels/in-app.channel';

export class NotificationChannelFactory {
  private channels: Map<NotificationChannel, INotificationChannel> = new Map();

  constructor(
    private emailChannel: EmailChannel,
    private smsChannel: SmsChannel,
    private pushChannel: PushChannel,
    private webhookChannel: WebhookChannel,
    private inAppChannel: InAppChannel
  ) {
    this.channels.set(NotificationChannel.EMAIL, this.emailChannel);
    this.channels.set(NotificationChannel.SMS, this.smsChannel);
    this.channels.set(NotificationChannel.PUSH, this.pushChannel);
    this.channels.set(NotificationChannel.WEBHOOK, this.webhookChannel);
    this.channels.set(NotificationChannel.IN_APP, this.inAppChannel);
  }

  getChannel(channelType: NotificationChannel): INotificationChannel {
    const channel = this.channels.get(channelType);
    if (!channel) {
      throw new Error(`Notification channel not supported: ${channelType}`);
    }
    return channel;
  }

  getAllChannels(): INotificationChannel[] {
    return Array.from(this.channels.values());
  }
}
