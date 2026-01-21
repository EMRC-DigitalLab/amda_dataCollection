// src/modules/notifications/channels/email.channel.ts
import { config } from '@/config';
import { NotificationChannel } from '@/database/entities/notification.entity';
import { logger } from '@/shared/utils/logger';
import nodemailer from 'nodemailer';
import {
    INotificationChannel,
    NotificationRequest,
    NotificationResult,
} from '../interfaces/notification.interface';

export class EmailChannel implements INotificationChannel {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure, // true for 465, false for other ports
      auth: {
         user: "emrctechteam@gmail.com",
         pass: "opbt usvu waos huzg",
      },
    });
  }

  async send(notification: NotificationRequest): Promise<NotificationResult> {
    try {
      const mailOptions = {
        from: config.email.from || `"${config.email.fromName}" <${config.email.user}>`,
        to: notification.recipientEmail,
        subject: notification.subject,
        text: notification.content,
        html: notification.htmlContent || notification.content,
        messageId: notification.id,
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
