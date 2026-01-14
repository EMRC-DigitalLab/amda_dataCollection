import { AppDataSource } from '@/config';
import { Form } from '@/database/entities/form.entity';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { User, UserRole } from '@/database/entities/user.entity';
import { logger } from '@/shared/utils/logger';
import { NotificationHelper } from '@/shared/utils/notification-helper';
import { WebSocketService } from '@/shared/websocket/websocket.service';

export class FormNotificationService {
  constructor(private webSocketService?: WebSocketService) {}

  // Helper to get all admins
  private async getAdminUsers(): Promise<User[]> {
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find();
    return users.filter((user) => user.role.includes(UserRole.ADMIN));
  }

  // ... (onFormPublished remains same)

  /**
   * Notify when new form submission is received
   */
  async onFormSubmissionReceived(form: Form, submission: any, submittedBy?: string): Promise<void> {
    console.log(`[DEBUG] onFormSubmissionReceived triggered for form: ${form.id}`);
    try {
      const adminUsers = await this.getAdminUsers();
      console.log(`[DEBUG] Found ${adminUsers.length} admin users to notify.`);

      if (adminUsers.length === 0) {
         console.warn('[DEBUG] No admin users found. Notification will not be sent.');
         return;
      }

      // Notify each admin
      await Promise.all(
        adminUsers.map(async (admin) => {
          console.log(`[DEBUG] Preparing notification for admin: ${admin.email} (${admin.id})`);
          
          // Real-time notification
          if (this.webSocketService) {
            await this.webSocketService.sendNotificationToUser(admin.id, {
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

          // Persistent notification (Email/In-App)
          await NotificationHelper.sendCustomNotification(
            admin.id,
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
        })
      );

      logger.info(`Form submission notification sent to ${adminUsers.length} admins for form: ${form.title}`);
    } catch (error) {
      logger.error('Error sending form submission notification:', error);
    }
  }

  // ... (onFormDeadlineApproaching remains same)

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
      const adminUsers = await this.getAdminUsers();
      const submitterId = submission.submitted_by;

      // Notify Submitters (Existing Logic)
      if (submitterId) {
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

        // Persistent notification to submitter
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
      }

      // Notify Admins (New Logic)
      await Promise.all(
        adminUsers.map(async (admin) => {
          // Skip if admin is the one who made the change (optional preference, but good for UX)
          if (admin.id === reviewedBy) return;

          // Real-time notification to admin
          if (this.webSocketService) {
            await this.webSocketService.sendNotificationToUser(admin.id, {
              id: 'status-changed-admin-' + Date.now(),
              type: 'submission_status_changed_admin', // Type for admin viewing status changes
              subject: 'Submission Status Updated',
              content: `Submission for "${form.title}" was updated to ${newStatus}`,
              priority: 'normal',
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

             // Persistent notification to admin
          await NotificationHelper.sendCustomNotification(
            admin.id,
            'submission_status_changed_admin',
            {
              formTitle: form.title,
              submissionId: submission.id,
              oldStatus,
              newStatus,
              reviewedBy: reviewedBy || 'System',
              reviewedAt: new Date().toISOString(),
              statusColor: this.getStatusColor(newStatus),
              reviewUrl: `https://admin.amda.com/forms/${form.id}/submissions/${submission.id}`,
            },
            {
              channel: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
              priority: NotificationPriority.NORMAL,
            }
          );
        })
      );

      logger.info(`Status change notification sent: ${oldStatus} → ${newStatus} (Notified submitter & admins)`);
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
      const activeFormsCount = forms.filter(form => form.status === 'PUBLISHED').length;

      // Real-time notification
      if (this.webSocketService) {
        await this.webSocketService.sendNotificationToUser(adminId, {
          id: 'activity-summary-' + Date.now(),
          type: 'form_activity_summary',
          subject: `${period.charAt(0).toUpperCase() + period.slice(1)} Form Activity Summary`,
          content: `Activity report for ${activeFormsCount} active forms`,
          priority: 'normal',
          createdAt: new Date(),
          metadata: {
            period,
            activeFormsCount,
            totalForms: forms.length,
            topForms: forms.slice(0, 3).map(f => ({ title: f.title, id: f.id })),
          },
        });
      }

      // Send detailed email summary
      await NotificationHelper.sendCustomNotification(
        adminId,
        'form_activity_summary',
        {
          period,
          activeFormsCount,
          totalForms: forms.length,
          topPerformingForms: forms.slice(0, 5).map(form => ({
            title: form.title,
            id: form.id,
            status: form.status,
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
