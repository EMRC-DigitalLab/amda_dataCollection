// src/modules/notifications/channels/email.channel.ts
import * as nodemailer from 'nodemailer';
import { config } from '@/config';
import {
  INotificationChannel,
  NotificationRequest,
  NotificationResult,
} from '../interfaces/notification.interface';
import { NotificationChannel } from '@/database/entities/notification.entity';
import { logger } from '@/shared/utils/logger';

export class EmailChannel implements INotificationChannel {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async send(notification: NotificationRequest): Promise<NotificationResult> {
    try {
      const mailOptions = {
        from: `"AMDA DataCollection Tool" <${config.email.user}>`,
        to: notification.recipientEmail,
        subject: notification.subject,
        text: notification.content,
        html: notification.htmlContent || notification.content,
        messageId: notification.id, // For tracking
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        providerId: 'nodemailer',
        providerMessageId: result.messageId,
        sentAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Email sending failed:', error);
      return {
        success: false,
        errorMessage: error.message,
        errorDetails: { error: error.toString() },
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email configuration invalid:', error);
      return false;
    }
  }

  getChannelType(): NotificationChannel {
    return NotificationChannel.EMAIL;
  }
}
