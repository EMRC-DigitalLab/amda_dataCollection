import { AppDataSource } from '@/config';
import { Form, FormStatus } from '@/database/entities/form.entity';
import { NotificationChannel, NotificationPriority } from '@/database/entities/notification.entity';
import { User } from '@/database/entities/user.entity';
import { logger } from '@/shared/utils/logger';
import { NotificationHelper } from '@/shared/utils/notification-helper';
import cron from 'node-cron';

export class SubmissionReminderService {
  private isRunning = false;

  constructor() {
    this.scheduleReminders();
    this.startCountdownLogger();
  }

  /**
   * Schedule the daily reminder job (8:00 AM)
   */
  private scheduleReminders() {
    // Schedule task to be run on the server.
    cron.schedule('0 8 * * *', async () => {
      logger.info('⏰ Starting daily submission reminder job...');
      await this.sendDailyReminders();
    });
    logger.info('✅ Daily submission reminder scheduled for 8:00 AM');
  }

  /**
   * Log time remaining until next run
   */
  private startCountdownLogger() {
    const logTimeRemaining = () => {
      const now = new Date();
      let nextRun = new Date();
      nextRun.setHours(8, 0, 0, 0);

      // If 8 AM has passed today, next run is tomorrow
      if (now > nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      const diffMs = nextRun.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      logger.info(`⏳ Next submission reminder in ${hours} hours and ${minutes} minutes (${nextRun.toLocaleString()})`);
    };

    // Log immediately
    logTimeRemaining();

    // Log every hour
    setInterval(logTimeRemaining, 1000 * 60 * 60);
  }

  /**
   * Main logic to find drafts and send emails
   */
  public async sendDailyReminders() {
    if (this.isRunning) {
      logger.warn('⚠️ Reminder job already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const formRepo = AppDataSource.getRepository(Form);
      
      // 1. Get all published forms with tables created
      const forms = await formRepo.find({
        where: {
          status: FormStatus.PUBLISHED,
          tableCreated: true
        }
      });

      logger.info(`Found ${forms.length} published forms to check for drafts.`);

      const pendingDraftsByUser: Record<string, {
        userId: string;
        userName: string;
        userEmail: string;
        drafts: { formTitle: string; submissionId: string; dateStarted: Date }[]
      }> = {};

      // 2. Iterate each form and find drafts
      for (const form of forms) {
        if (!form.tableName) continue;

        try {
          // Dynamic query on form's table
          const drafts = await AppDataSource.query(
            `SELECT id, submitted_by, created_at, updated_at FROM "${form.tableName}" WHERE status = 'DRAFT'`
          );

          if (drafts.length > 0) {
             // Look up user details for each draft
             for (const draft of drafts) {
                const userId = draft.submitted_by;
                if (!userId) continue;

                // Initialize user group if not exists
                if (!pendingDraftsByUser[userId]) {
                   // Fetch user details
                   // Try User first
                   const userRepo = AppDataSource.getRepository(User);
                   const user = await userRepo.findOne({ where: { id: userId } });
                   
                   let email = user?.email;
                   let name = user?.fullName;

                   // If not found or if unrelated, try Member logic if strictly separate?
                   // Assuming `submitted_by` is the User UUID as per auth service.
                   
                   if (user) {
                       pendingDraftsByUser[userId] = {
                           userId: user.id,
                           userEmail: user.email,
                           userName: user.fullName,
                           drafts: []
                       };
                   } else {
                        // Log warning if user not found for ID
                        // logger.warn(`User not found for draft in form ${form.title}, ID: ${userId}`);
                        continue;
                   }
                }

                // Add draft to user's list
                pendingDraftsByUser[userId].drafts.push({
                    formTitle: form.title,
                    submissionId: draft.id,
                    dateStarted: draft.updated_at || draft.created_at
                });
             }
          }

        } catch (err) {
            logger.error(`Failed to query drafts for form ${form.title} (${form.tableName})`, err);
        }
      }

      // 3. Send Emails
      const userIds = Object.keys(pendingDraftsByUser);
      logger.info(`Found ${userIds.length} users with pending drafts.`);

      for (const userId of userIds) {
          const userDrafts = pendingDraftsByUser[userId];
          
          if (!userDrafts.userEmail) {
              logger.warn(`Skipping reminder for user ${userId} (No email)`);
              continue;
          }

          // Limit number of items shown?
          const draftList = userDrafts.drafts.map(d => `- ${d.formTitle} (Started: ${new Date(d.dateStarted).toLocaleDateString()})`).join('<br>');

          logger.info(`Sending reminder to ${userDrafts.userEmail} for ${userDrafts.drafts.length} drafts.`);

          await NotificationHelper.sendCustomNotification(
              userId,
              'submission_reminder',
              {
                  userName: userDrafts.userName,
                  pendingCount: userDrafts.drafts.length,
                  draftList: draftList,
                  dashboardUrl: 'https://app.amda.com/dashboard' // Update if needed
              },
              {
                  channel: [NotificationChannel.EMAIL],
                  priority: NotificationPriority.LOW
              }
          );
      }

      logger.info('✅ Daily submission reminders sent successfully.');

    } catch (error) {
       logger.error('❌ Error sending daily reminders:', error);
    } finally {
        this.isRunning = false;
    }
  }
}
