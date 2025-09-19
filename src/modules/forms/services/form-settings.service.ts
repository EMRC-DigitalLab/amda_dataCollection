import { Injectable } from 'injection-js';
import { FormSettings } from '../../../database/entities/form-settings.entity';
import { FormSettingsRepository } from '../../../database/repositories/forms/form-settings.repository';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { AppError } from '../../../shared/middleware/error.middleware';
import { AuditLogService } from '../../../shared/utils/form-audit';
import { CacheService } from '../../../shared/utils/forms-cache';
import { NotificationService } from '../../../shared/utils/forms-notification';
import { Logger } from '../../../shared/utils/forms-settings.logger';
import {
  ICreateFormSettings,
  IFormSettings,
  IFormSettingsListResponse,
  IFormSettingsQuery,
  IFormSettingsResponse,
  IUpdateFormSettings,
} from '../interfaces/form-settings.interface';

@Injectable()
export class FormSettingsService {
  // private formSettingsRepository: FormSettingsRepository;
  // private formRepository: FormRepository;
  // private notificationService: NotificationService;
  // private auditLogService: AuditLogService;
  // private cacheService: CacheService;
  private logger: Logger;

  constructor(
    private readonly formSettingsRepository: FormSettingsRepository,
    private readonly formRepository: FormRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
    private readonly cacheService: CacheService
  ) {
    this.logger = new Logger('FormSettingsService');
  }

  /**
   * Create form settings
   */
  async createFormSettings(
    data: ICreateFormSettings,
    adminId: string
  ): Promise<IFormSettingsResponse> {
    try {
      // Verify form exists and belongs to admin
      const form = await this.formRepository.findFormById(data.formId);
      if (!form) {
        throw new AppError('Form not found', 404);
      }

      if (form.adminId !== adminId) {
        throw new AppError('Unauthorized to modify this form', 403);
      }

      // Check if settings already exist
      const existingSettings = await this.formSettingsRepository.findByFormId(data.formId);
      if (existingSettings) {
        throw new AppError('Form settings already exist for this form', 409);
      }

      // Validate deadline logic
      this.validateDeadlineSettings(data);

      // Create form settings
      const formSettings = await this.formSettingsRepository.create(data);

      // Clear cache
      await this.cacheService.delete(`form-settings:${data.formId}`);

      // Log audit event
      if (formSettings.enableAuditLog) {
        await this.auditLogService.log({
          action: 'CREATE_FORM_SETTINGS',
          resourceType: 'FormSettings',
          resourceId: formSettings.id,
          adminId,
          details: { formId: data.formId },
        });
      }

      this.logger.info(`Form settings created for form ${data.formId}`, {
        adminId,
        settingsId: formSettings.id,
      });

      return {
        success: true,
        data: this.transformFormSettings(formSettings),
        message: 'Form settings created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating form settings', error, { adminId, formId: data.formId });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to create form settings', 500);
    }
  }

  /**
   * Create default form settings for a new form
   */
  async createDefaultSettings(formId: string, adminId: string): Promise<FormSettings> {
    try {
      const formSettings = await this.formSettingsRepository.createWithDefaults(formId);

      this.logger.info(`Default form settings created for form ${formId}`, {
        adminId,
        settingsId: formSettings.id,
      });

      return formSettings;
    } catch (error) {
      this.logger.error('Error creating default form settings', error, { adminId, formId });
      throw new AppError('Failed to create default form settings', 500);
    }
  }

  /**
   * Get form settings by ID
   */
  async getFormSettingsById(id: string, adminId: string): Promise<IFormSettingsResponse> {
    try {
      // Try cache first
      const cacheKey = `form-settings:id:${id}`;
      let formSettings = await this.cacheService.get<FormSettings>(cacheKey);

      if (!formSettings) {
        formSettings = await this.formSettingsRepository.findWithFormDetails(id);
        if (formSettings) {
          await this.cacheService.set(cacheKey, formSettings, 300); // 5 minutes
        }
      }

      if (!formSettings) {
        throw new AppError('Form settings not found', 404);
      }

      // Check authorization
      // if (formSettings.form.adminId !== adminId) {
      //   throw new AppError('Unauthorized to access these form settings', 403);
      // }

      return {
        success: true,
        data: this.transformFormSettings(formSettings),
        message: 'Form settings retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error retrieving form settings by ID', error, { adminId, id });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to retrieve form settings', 500);
    }
  }

  /**
   * Get form settings by form ID
   */
  async getFormSettingsByFormId(formId: string, adminId: string): Promise<IFormSettingsResponse> {
    try {
      // Try cache first
      const cacheKey = `form-settings:${formId}`;
      let formSettings = await this.cacheService.get<FormSettings>(cacheKey);

      if (!formSettings) {
        formSettings = await this.formSettingsRepository.findByFormId(formId);
        if (formSettings) {
          await this.cacheService.set(cacheKey, formSettings, 300); // 5 minutes
        }
      }

      if (!formSettings) {
        // Create default settings if none exist
        formSettings = await this.createDefaultSettings(formId, adminId);
      }

      // Check authorization
      const form = await this.formRepository.findFormById(formId);
      // if (!form || form.adminId !== adminId) {
      //   throw new AppError('Unauthorized to access these form settings', 403);
      // }

      return {
        success: true,
        data: this.transformFormSettings(formSettings),
        message: 'Form settings retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error retrieving form settings by form ID', error, { adminId, formId });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to retrieve form settings', 500);
    }
  }

  /**
   * Update form settings
   */
  async updateFormSettings(
    id: string,
    data: IUpdateFormSettings,
    adminId: string
  ): Promise<IFormSettingsResponse> {
    try {
      // Get existing settings
      const existingSettings = await this.formSettingsRepository.findWithFormDetails(id);
      if (!existingSettings) {
        throw new AppError('Form settings not found', 404);
      }

      // Check authorization
      if (existingSettings.form.adminId !== adminId) {
        throw new AppError('Unauthorized to modify these form settings', 403);
      }

      // Validate deadline logic
      this.validateDeadlineSettings(data);

      // Update settings
      const updatedSettings = await this.formSettingsRepository.update(id, data);
      if (!updatedSettings) {
        throw new AppError('Failed to update form settings', 500);
      }

      // Clear cache
      await this.cacheService.delete(`form-settings:${updatedSettings.formId}`);
      await this.cacheService.delete(`form-settings:id:${id}`);

      // Log audit event
      if (updatedSettings.enableAuditLog) {
        await this.auditLogService.log({
          action: 'UPDATE_FORM_SETTINGS',
          resourceType: 'FormSettings',
          resourceId: id,
          adminId,
          details: { changes: data },
        });
      }

      // Send notifications if settings changed
      await this.handleSettingsChangeNotifications(existingSettings, updatedSettings, adminId);

      this.logger.info(`Form settings updated for form ${updatedSettings.formId}`, {
        adminId,
        settingsId: id,
      });

      return {
        success: true,
        data: this.transformFormSettings(updatedSettings),
        message: 'Form settings updated successfully',
      };
    } catch (error) {
      this.logger.error('Error updating form settings', error, { adminId, id });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to update form settings', 500);
    }
  }

  /**
   * Delete form settings
   */
  async deleteFormSettings(id: string, adminId: string): Promise<IFormSettingsResponse> {
    try {
      // Get existing settings
      const existingSettings = await this.formSettingsRepository.findWithFormDetails(id);
      if (!existingSettings) {
        throw new AppError('Form settings not found', 404);
      }

      // Check authorization
      if (existingSettings.form.adminId !== adminId) {
        throw new AppError('Unauthorized to delete these form settings', 403);
      }

      // Delete settings
      const deleted = await this.formSettingsRepository.delete(id);
      if (!deleted) {
        throw new AppError('Failed to delete form settings', 500);
      }

      // Clear cache
      await this.cacheService.delete(`form-settings:${existingSettings.formId}`);
      await this.cacheService.delete(`form-settings:id:${id}`);

      // Log audit event
      if (existingSettings.enableAuditLog) {
        await this.auditLogService.log({
          action: 'DELETE_FORM_SETTINGS',
          resourceType: 'FormSettings',
          resourceId: id,
          adminId,
          details: { formId: existingSettings.formId },
        });
      }

      this.logger.info(`Form settings deleted for form ${existingSettings.formId}`, {
        adminId,
        settingsId: id,
      });

      return {
        success: true,
        message: 'Form settings deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting form settings', error, { adminId, id });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Failed to delete form settings', 500);
    }
  }

  /**
   * List form settings with filtering and pagination
   */
  async listFormSettings(
    query: IFormSettingsQuery,
    adminId: string
  ): Promise<IFormSettingsListResponse> {
    try {
      // Get admin's form IDs if not filtering by specific form
      let adminFormIds: string[] = [];
      if (!query.formId) {
        const adminForms = await this.formRepository.findByAdminId(adminId);
        adminFormIds = adminForms.map(form => form.id);

        if (adminFormIds.length === 0) {
          return {
            success: true,
            data: {
              settings: [],
              total: 0,
              page: query.page || 1,
              limit: query.limit || 20,
              totalPages: 0,
            },
            message: 'No form settings found',
          };
        }
      }

      // Modify query to include admin's forms
      const modifiedQuery = { ...query };
      if (!modifiedQuery.formId && adminFormIds.length > 0) {
        // This would need to be handled in the repository layer
        // For now, we'll get all and filter
      }

      const result = await this.formSettingsRepository.findAll(modifiedQuery);

      // Filter by admin's forms if necessary
      if (!query.formId) {
        result.settings = result.settings.filter(settings =>
          adminFormIds.includes(settings.formId)
        );
        result.total = result.settings.length;
        result.totalPages = Math.ceil(result.total / (query.limit || 20));
      }

      return {
        success: true,
        data: {
          settings: result.settings.map(settings => this.transformFormSettings(settings)),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        message: 'Form settings retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error listing form settings', error, { adminId, query });
      throw new AppError('Failed to retrieve form settings list', 500);
    }
  }

  /**
   * Get form settings statistics for admin
   */
  async getFormSettingsStatistics(adminId: string): Promise<any> {
    try {
      const adminSettings = await this.formSettingsRepository.findByAdminId(adminId);

      const stats = {
        total: adminSettings.length,
        byPrivacyLevel: {} as Record<string, number>,
        bySubmissionBehavior: {} as Record<string, number>,
        withDeadlines: 0,
        withNotifications: 0,
        withCaptcha: 0,
        expired: 0,
        needingWarnings: 0,
      };

      const now = new Date();

      adminSettings.forEach(settings => {
        // Count by privacy level
        stats.byPrivacyLevel[settings.privacyLevel] =
          (stats.byPrivacyLevel[settings.privacyLevel] || 0) + 1;

        // Count by submission behavior
        stats.bySubmissionBehavior[settings.submissionBehavior] =
          (stats.bySubmissionBehavior[settings.submissionBehavior] || 0) + 1;

        // Count features
        if (settings.submissionDeadline) stats.withDeadlines++;
        if (settings.notifyOnSubmission) stats.withNotifications++;
        if (settings.enableCaptcha) stats.withCaptcha++;

        // Count expired
        if (settings.submissionDeadline && settings.submissionDeadline < now) {
          stats.expired++;
        }

        // Count needing warnings
        if (settings.shouldSendDeadlineWarning()) {
          stats.needingWarnings++;
        }
      });

      return {
        success: true,
        data: stats,
        message: 'Form settings statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error getting form settings statistics', error, { adminId });
      throw new AppError('Failed to retrieve form settings statistics', 500);
    }
  }

  /**
   * Check if form is accepting submissions
   */
  async checkFormAccess(formId: string): Promise<{
    canSubmit: boolean;
    message?: string;
    redirectUrl?: string;
  }> {
    try {
      const settings = await this.formSettingsRepository.findByFormId(formId);
      if (!settings) {
        return { canSubmit: true }; // No settings = default allow
      }

      const canSubmit = settings.isAcceptingSubmissions();

      if (!canSubmit) {
        return {
          canSubmit: false,
          message: settings.deadlineMessage || 'This form is no longer accepting submissions',
          redirectUrl: settings.redirectUrl,
        };
      }

      return { canSubmit: true };
    } catch (error) {
      this.logger.error('Error checking form access', error, { formId });
      throw new AppError('Failed to check form access', 500);
    }
  }

  /**
   * Process deadline warnings (called by scheduler)
   */
  async processDeadlineWarnings(): Promise<void> {
    try {
      const settingsNeedingWarnings =
        await this.formSettingsRepository.findSettingsNeedingDeadlineWarnings();

      for (const settings of settingsNeedingWarnings) {
        await this.sendDeadlineWarning(settings);
      }

      this.logger.info(`Processed ${settingsNeedingWarnings.length} deadline warnings`);
    } catch (error) {
      this.logger.error('Error processing deadline warnings', error);
    }
  }

  /**
   * Transform FormSettings entity to interface
   */
  private transformFormSettings(settings: FormSettings): IFormSettings {
    return {
      id: settings.id,
      formId: settings.formId,
      privacyLevel: settings.privacyLevel,
      requireAuthentication: settings.requireAuthentication,
      allowAnonymousSubmissions: settings.allowAnonymousSubmissions,
      allowedDomains: settings.getAllowedDomains(),
      allowedUsers: settings.getAllowedUsers(),
      allowedRoles: settings.getAllowedRoles(),
      submissionBehavior: settings.submissionBehavior,
      maxSubmissions: settings.maxSubmissions,
      maxSubmissionsPerUser: settings.maxSubmissionsPerUser,
      allowDraftSave: settings.allowDraftSave,
      requireAllFields: settings.requireAllFields,
      submissionDeadline: settings.submissionDeadline,
      startDate: settings.startDate,
      deadlineAction: settings.deadlineAction,
      deadlineMessage: settings.deadlineMessage,
      redirectUrl: settings.redirectUrl,
      gracePeriodHours: settings.gracePeriodHours,
      notificationTypes: settings.getNotificationTypes(),
      notifyOnSubmission: settings.notifyOnSubmission,
      notifyOnDeadlineApproaching: settings.notifyOnDeadlineApproaching,
      deadlineWarningHours: settings.deadlineWarningHours,
      notificationEmails: settings.getNotificationEmails(),
      webhookUrl: settings.webhookUrl,
      showProgressBar: settings.showProgressBar,
      showSubmissionCounter: settings.showSubmissionCounter,
      showRequiredIndicators: settings.showRequiredIndicators,
      customCss: settings.customCss,
      customJavaScript: settings.customJavaScript,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      enableCaptcha: settings.enableCaptcha,
      enableRateLimiting: settings.enableRateLimiting,
      maxSubmissionsPerMinute: settings.maxSubmissionsPerMinute,
      logIpAddresses: settings.logIpAddresses,
      enableEncryption: settings.enableEncryption,
      sendConfirmationEmail: settings.sendConfirmationEmail,
      confirmationEmailSubject: settings.confirmationEmailSubject,
      confirmationEmailTemplate: settings.confirmationEmailTemplate,
      thankYouPageUrl: settings.thankYouPageUrl,
      thankYouMessage: settings.thankYouMessage,
      enableConditionalLogic: settings.enableConditionalLogic,
      conditionalRules: settings.getConditionalRules(),
      enableFieldValidation: settings.enableFieldValidation,
      validationRules: settings.getValidationRules(),
      autoSaveInterval: settings.autoSaveInterval,
      enableAuditLog: settings.enableAuditLog,
      customMetadata: settings.getCustomMetadata(),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Validate deadline settings
   */
  private validateDeadlineSettings(data: Partial<ICreateFormSettings>): void {
    if (data.startDate && data.submissionDeadline) {
      const startDate = new Date(data.startDate);
      const deadline = new Date(data.submissionDeadline);

      if (startDate >= deadline) {
        throw new AppError('Start date must be before submission deadline', 400);
      }
    }

    if (data.submissionDeadline && data.deadlineAction === 'REDIRECT' && !data.redirectUrl) {
      throw new AppError('Redirect URL is required when deadline action is REDIRECT', 400);
    }
  }

  /**
   * Handle settings change notifications
   */
  private async handleSettingsChangeNotifications(
    oldSettings: FormSettings,
    newSettings: FormSettings,
    adminId: string
  ): Promise<void> {
    // Notify if deadline changed
    if (oldSettings.submissionDeadline !== newSettings.submissionDeadline) {
      // Implementation would depend on your notification system
    }

    // Notify if privacy level changed
    if (oldSettings.privacyLevel !== newSettings.privacyLevel) {
      // Implementation would depend on your notification system
    }
  }

  /**
   * Send deadline warning notification
   */
  private async sendDeadlineWarning(settings: FormSettings): Promise<void> {
    const emails = settings.getNotificationEmails();
    const notificationTypes = settings.getNotificationTypes();

    for (const type of notificationTypes) {
      switch (type) {
        case 'EMAIL':
          if (emails.length > 0) {
            await this.notificationService.sendEmail({
              to: emails,
              subject: `Deadline Warning: ${settings.form.title}`,
              template: 'deadline-warning',
              data: {
                formTitle: settings.form.title,
                deadline: settings.submissionDeadline,
                hoursRemaining: settings.deadlineWarningHours,
              },
            });
          }
          break;
        case 'WEBHOOK':
          if (settings.webhookUrl) {
            await this.notificationService.sendWebhook(settings.webhookUrl, {
              event: 'deadline_warning',
              formId: settings.formId,
              formTitle: settings.form.title,
              deadline: settings.submissionDeadline,
              hoursRemaining: settings.deadlineWarningHours,
            });
          }
          break;
      }
    }
  }
}
