// src/modules/forms/services/form-notification.service.ts
import { WebSocketService } from '@/shared/websocket/websocket.service';
import { NotificationHelper } from '@/shared/utils/notification-helper';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { Form } from '@/database/entities/form.entity';
import { FormSettings } from '@/database/entities/form-settings.entity';
import { logger } from '@/shared/utils/logger';

export class FormNotificationService {
  constructor(private webSocketService?: WebSocketService) {}

  /**
   * Notify when form is published
   */
  async onFormPublished(form: Form, publishedBy: string): Promise<void> {
    try {
      // Real-time WebSocket notification to admin
      if (this.webSocketService) {
        await this.webSocketService.sendNotificationToUser(publishedBy, {
          id: 'form-published-' + Date.now(),
          type: 'form_published',
          subject: 'Form Published Successfully',
          content: `Your form "${form.title}" has been published and is now accepting submissions.`,
          priority: 'normal',
          createdAt: new Date(),
          metadata: {
            formId: form.id,
            formTitle: form.title,
            formType: form.formType,
            action: 'published',
          },
        });
      }

      // Send persistent notification
      await NotificationHelper.sendCustomNotification(
        publishedBy,
        'form_published',
        {
          formTitle: form.title,
          formId: form.id,
          formType: form.formType,
          publishedAt: new Date().toISOString(),
          formUrl: `https://app.amda.com/forms/${form.slug}`,
        },
        {
          channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.NORMAL,
        }
      );

      logger.info(`Form published notification sent for: ${form.title}`);
    } catch (error) {
      logger.error('Error sending form published notification:', error);
    }
  }

  /**
   * Notify when new form submission is received
   */
  async onFormSubmissionReceived(form: Form, submission: any, submittedBy?: string): Promise<void> {
    try {
      // Real-time notification to form owner
      if (this.webSocketService) {
        await this.webSocketService.sendNotificationToUser(form.adminId, {
          id: 'submission-received-' + Date.now(),
          type: 'form_submission',
          subject: 'New Form Submission',
          content: `New submission received for form "${form.title}"`,
          priority: 'normal',
          createdAt: new Date(),
          metadata: {
            formId: form.id,
            formTitle: form.title,
            submissionId: submission.id,
            submittedBy: submittedBy || 'Anonymous',
            submittedAt: submission.submitted_at,
          },
        });
      }

      // Send persistent notification to admin
      await NotificationHelper.sendCustomNotification(
        form.adminId,
        'form_submission_received',
        {
          formTitle: form.title,
          formId: form.id,
          submissionId: submission.id,
          submitterName: submittedBy || 'Anonymous user',
          submittedAt: new Date().toISOString(),
          reviewUrl: `https://admin.amda.com/forms/${form.id}/submissions/${submission.id}`,
        },
        {
          channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.NORMAL,
        }
      );

      logger.info(`Form submission notification sent for form: ${form.title}`);
    } catch (error) {
      logger.error('Error sending form submission notification:', error);
    }
  }

  /**
   * Notify when form deadline is approaching
   */
  async onFormDeadlineApproaching(
    form: Form,
    hoursRemaining: number,
    affectedUsers: string[]
  ): Promise<void> {
    try {
      // Real-time notifications to all affected users
      if (this.webSocketService && affectedUsers.length > 0) {
        await this.webSocketService.sendNotificationToUsers(affectedUsers, {
          id: 'deadline-warning-' + Date.now(),
          type: 'form_deadline_warning',
          subject: 'Form Deadline Approaching',
          content: `The form "${form.title}" expires in ${hoursRemaining} hours`,
          priority: 'high',
          createdAt: new Date(),
          metadata: {
            formId: form.id,
            formTitle: form.title,
            hoursRemaining,
            deadlineAt: form.settings?.submissionDeadline,
          },
        });
      }

      // Send bulk notifications
      await NotificationHelper.sendMaintenanceNotification(affectedUsers, {
        startTime: new Date().toISOString(),
        endTime: form.settings?.submissionDeadline?.toISOString() || 'Unknown',
        affectedServices: [form.title],
      });

      logger.info(`Deadline warning sent for form: ${form.title} to ${affectedUsers.length} users`);
    } catch (error) {
      logger.error('Error sending deadline warning notification:', error);
    }
  }

  /**
   * Notify when form submission status changes
   */
  async onSubmissionStatusChanged(
    form: Form,
    submission: any,
    oldStatus: string,
    newStatus: string,
    reviewedBy?: string
  ): Promise<void> {
    try {
      const submitterId = submission.submitted_by;
      if (!submitterId) return;

      // Real-time notification to submitter
      if (this.webSocketService) {
        await this.webSocketService.sendNotificationToUser(submitterId, {
          id: 'status-changed-' + Date.now(),
          type: 'submission_status_changed',
          subject: 'Submission Status Updated',
          content: `Your submission for "${form.title}" has been ${newStatus.toLowerCase()}`,
          priority: newStatus === 'APPROVED' ? 'normal' : 'high',
          createdAt: new Date(),
          metadata: {
            formId: form.id,
            formTitle: form.title,
            submissionId: submission.id,
            oldStatus,
            newStatus,
            reviewedBy,
          },
        });
      }

      // Send persistent notification
      await NotificationHelper.sendCustomNotification(
        submitterId,
        'submission_status_changed',
        {
          formTitle: form.title,
          submissionId: submission.id,
          oldStatus,
          newStatus,
          reviewedBy: reviewedBy || 'System',
          reviewedAt: new Date().toISOString(),
          statusColor: this.getStatusColor(newStatus),
          submissionUrl: `https://app.amda.com/forms/${form.slug}/submission/${submission.id}`,
        },
        {
          channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority:
            newStatus === 'REJECTED' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
        }
      );

      logger.info(`Status change notification sent: ${oldStatus} → ${newStatus}`);
    } catch (error) {
      logger.error('Error sending status change notification:', error);
    }
  }

  /**
   * Notify when form has reached submission limit
   */
  async onFormSubmissionLimitReached(form: Form): Promise<void> {
    try {
      // Real-time notification to admin
      if (this.webSocketService) {
        await this.webSocketService.sendNotificationToUser(form.adminId, {
          id: 'limit-reached-' + Date.now(),
          type: 'form_limit_reached',
          subject: 'Form Submission Limit Reached',
          content: `Form "${form.title}" has reached its maximum submission limit`,
          priority: 'urgent',
          createdAt: new Date(),
          metadata: {
            formId: form.id,
            formTitle: form.title,
            maxSubmissions: form.maxSubmissions,
            currentSubmissions: form.submissionCount,
          },
        });
      }

      // Send persistent notification
      await NotificationHelper.sendCustomNotification(
        form.adminId,
        'form_limit_reached',
        {
          formTitle: form.title,
          formId: form.id,
          maxSubmissions: form.maxSubmissions,
          currentSubmissions: form.submissionCount,
          formUrl: `https://admin.amda.com/forms/${form.id}`,
          suggestedActions: ['Increase limit', 'Archive form', 'Export data'],
        },
        {
          channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.URGENT,
        }
      );

      logger.info(`Submission limit notification sent for form: ${form.title}`);
    } catch (error) {
      logger.error('Error sending submission limit notification:', error);
    }
  }

  /**
   * Notify about daily/weekly form activity summary
   */
  async sendFormActivitySummary(
    adminId: string,
    forms: Form[],
    period: 'daily' | 'weekly'
  ): Promise<void> {
    try {
      const totalSubmissions = forms.reduce((sum, form) => sum + (form.submissionCount || 0), 0);
      const activeFormsCount = forms.filter(form => form.status === 'PUBLISHED').length;

      // Real-time notification
      if (this.webSocketService) {
        await this.webSocketService.sendNotificationToUser(adminId, {
          id: 'activity-summary-' + Date.now(),
          type: 'form_activity_summary',
          subject: `${period.charAt(0).toUpperCase() + period.slice(1)} Form Activity Summary`,
          content: `${totalSubmissions} new submissions across ${activeFormsCount} active forms`,
          priority: 'normal',
          createdAt: new Date(),
          metadata: {
            period,
            totalSubmissions,
            activeFormsCount,
            totalForms: forms.length,
            topForms: forms
              .slice(0, 3)
              .map(f => ({ title: f.title, submissions: f.submissionCount })),
          },
        });
      }

      // Send detailed email summary
      await NotificationHelper.sendCustomNotification(
        adminId,
        'form_activity_summary',
        {
          period,
          totalSubmissions,
          activeFormsCount,
          totalForms: forms.length,
          topPerformingForms: forms
            .sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0))
            .slice(0, 5)
            .map(form => ({
              title: form.title,
              submissions: form.submissionCount || 0,
              completionRate: form.completionRate || 0,
            })),
          dashboardUrl: 'https://admin.amda.com/dashboard',
        },
        {
          channel: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL,
        }
      );

      logger.info(`${period} activity summary sent to admin: ${adminId}`);
    } catch (error) {
      logger.error('Error sending activity summary:', error);
    }
  }

  private getStatusColor(status: string): string {
    const colors = {
      APPROVED: '#22c55e',
      REJECTED: '#ef4444',
      PENDING: '#f59e0b',
      DRAFT: '#6b7280',
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  }
}
