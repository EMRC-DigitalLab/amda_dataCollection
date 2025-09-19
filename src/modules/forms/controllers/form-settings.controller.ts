// @ts-nocheck
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FormSettingsRepository } from '../../../database/repositories/forms/form-settings.repository';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { AuthenticatedRequest } from '../../../shared/middleware/auth.middleware';
import { AppError } from '../../../shared/middleware/error.middleware';
import { AuditLogService } from '../../../shared/utils/form-audit';
import { CacheService } from '../../../shared/utils/forms-cache';
import { NotificationService } from '../../../shared/utils/forms-notification';
import { Logger } from '../../../shared/utils/forms-settings.logger';
import { ResponseHelper } from '../../../shared/utils/response';
import {
  CreateFormSettingsDto,
  NotificationSettingsDto,
  QueryFormSettingsDto,
  UpdateFormSettingsDto,
} from '../dtos/form-settings.dto';
import { FormSettingsService } from '../services/form-settings.service';

export class FormSettingsController {
  private formSettingsService: FormSettingsService;
  private logger: Logger;

  constructor(dataSource: DataSource) {
    this.formSettingsService = new FormSettingsService(
      new FormSettingsRepository(dataSource),
      new FormRepository(dataSource),
      new NotificationService(),
      new AuditLogService(),
      new CacheService()
    );
    this.logger = new Logger('FormSettingsController');
  }

  /**
   * Create form settings
   * POST /api/v1/form-settings
   */
  createFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto = plainToClass(CreateFormSettingsDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new AppError('Validation failed', 400, errors);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.createFormSettings(dto, adminId);

      this.logger.info('Form settings created successfully', {
        adminId,
        formId: dto.formId,
        settingsId: result.data?.id,
      });

      res.status(201).json(result);
    } catch (error) {
      this.logger.error('Error creating form settings', error, {
        adminId: req.user?.id,
        body: req.body,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Get form settings by ID
   * GET /api/v1/form-settings/:id
   */
  getFormSettingsById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.getFormSettingsById(id, adminId);

      this.logger.info('Form settings retrieved by ID', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error retrieving form settings by ID', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Get form settings by form ID
   * GET /api/v1/form-settings/form/:formId
   */
  getFormSettingsByFormId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { formId } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.getFormSettingsByFormId(formId, adminId);

      this.logger.info('Form settings retrieved by form ID', { adminId, formId });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error retrieving form settings by form ID', error, {
        adminId: req.user?.id,
        formId: req.params.formId,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Update form settings
   * PUT /api/v1/form-settings/:id
   */
  updateFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const dto = plainToClass(UpdateFormSettingsDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new AppError('Validation failed', 400, errors);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.updateFormSettings(id, dto, adminId);

      this.logger.info('Form settings updated', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating form settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
        body: req.body,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Delete form settings
   * DELETE /api/v1/form-settings/:id
   */
  deleteFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.deleteFormSettings(id, adminId);

      this.logger.info('Form settings deleted', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error deleting form settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * List form settings with filtering and pagination
   * GET /api/v1/form-settings
   */
  listFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto = plainToClass(QueryFormSettingsDto, req.query);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new AppError('Validation failed', 400, errors);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.listFormSettings(dto, adminId);

      this.logger.info('Form settings list retrieved', {
        adminId,
        page: dto.page,
        limit: dto.limit,
        totalResults: result.data?.total,
      });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error listing form settings', error, {
        adminId: req.user?.id,
        query: req.query,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Get form settings statistics
   * GET /api/v1/form-settings/statistics
   */
  getFormSettingsStatistics = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.getFormSettingsStatistics(adminId);

      this.logger.info('Form settings statistics retrieved', { adminId });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error retrieving form settings statistics', error, {
        adminId: req.user?.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Check form access (public endpoint for form rendering)
   * GET /api/v1/public/form-settings/form/:formId/access
   */
  checkFormAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { formId } = req.params;

      const result = await this.formSettingsService.checkFormAccess(formId);

      // Don't log user info for public endpoint
      this.logger.info('Form access checked', { formId, canSubmit: result.canSubmit });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Form access checked successfully',
      });
    } catch (error) {
      this.logger.error('Error checking form access', error, { formId: req.params.formId });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  // Specialized endpoints for different settings sections

  /**
   * Update access control settings
   * PATCH /api/v1/form-settings/:id/access-control
   */
  updateAccessControl = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.updateFormSettings(id, req.body, adminId);

      this.logger.info('Access control settings updated', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating access control settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Update deadline settings
   * PATCH /api/v1/form-settings/:id/deadline
   */
  updateDeadlineSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.updateFormSettings(id, req.body, adminId);

      this.logger.info('Deadline settings updated', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating deadline settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Update notification settings
   * PATCH /api/v1/form-settings/:id/notifications
   */
  updateNotificationSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const dto = plainToClass(NotificationSettingsDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new AppError('Validation failed', 400, errors);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.updateFormSettings(id, dto, adminId);

      this.logger.info('Notification settings updated', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating notification settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Update display settings
   * PATCH /api/v1/form-settings/:id/display
   */
  updateDisplaySettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.updateFormSettings(id, req.body, adminId);

      this.logger.info('Display settings updated', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating display settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Update security settings
   * PATCH /api/v1/form-settings/:id/security
   */
  updateSecuritySettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.updateFormSettings(id, req.body, adminId);

      this.logger.info('Security settings updated', { adminId, settingsId: id });

      res.status(200).json(result);
    } catch (error) {
      this.logger.error('Error updating security settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Clone form settings to another form
   * POST /api/v1/form-settings/:id/clone
   */
  cloneFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { targetFormId } = req.body;

      if (!targetFormId) {
        throw new AppError('Target form ID is required', 400);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      // Get source settings
      const sourceResult = await this.formSettingsService.getFormSettingsById(id, adminId);
      if (!sourceResult.success || !sourceResult.data) {
        throw new AppError('Source form settings not found', 404);
      }

      // Create new settings for target form
      const { data: sourceSettings } = sourceResult;
      const cloneData: any = { ...sourceSettings, formId: targetFormId };

      // Remove non-cloneable fields
      delete cloneData.id;
      delete cloneData.createdAt;
      delete cloneData.updatedAt;

      const result = await this.formSettingsService.createFormSettings(cloneData, adminId);

      this.logger.info('Form settings cloned', {
        adminId,
        sourceId: id,
        targetFormId,
        newSettingsId: result.data?.id,
      });

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Form settings cloned successfully',
      });
    } catch (error) {
      this.logger.error('Error cloning form settings', error, {
        adminId: req.user?.id,
        sourceId: req.params.id,
        targetFormId: req.body.targetFormId,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Reset form settings to defaults
   * POST /api/v1/form-settings/:id/reset
   */
  resetFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      // Get current settings to preserve formId
      const currentResult = await this.formSettingsService.getFormSettingsById(id, adminId);
      if (!currentResult.success || !currentResult.data) {
        throw new AppError('Form settings not found', 404);
      }

      // Reset to defaults
      const defaultSettings = {
        privacyLevel: 'PRIVATE' as const,
        requireAuthentication: false,
        allowAnonymousSubmissions: false,
        submissionBehavior: 'SINGLE' as const,
        allowDraftSave: true,
        requireAllFields: false,
        deadlineAction: 'DISABLE_FORM' as const,
        gracePeriodHours: 0,
        notifyOnSubmission: true,
        notifyOnDeadlineApproaching: false,
        deadlineWarningHours: 24,
        showProgressBar: true,
        showSubmissionCounter: false,
        showRequiredIndicators: true,
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        enableCaptcha: false,
        enableRateLimiting: false,
        maxSubmissionsPerMinute: 10,
        logIpAddresses: false,
        enableEncryption: false,
        sendConfirmationEmail: false,
        enableConditionalLogic: false,
        enableFieldValidation: false,
        enableAuditLog: false,
        // Clear all optional fields
        allowedDomains: [],
        allowedUsers: [],
        allowedRoles: [],
        notificationTypes: [],
        notificationEmails: [],
        submissionDeadline: undefined,
        startDate: undefined,
        deadlineMessage: undefined,
        redirectUrl: undefined,
        webhookUrl: undefined,
        customCss: undefined,
        customJavaScript: undefined,
        logoUrl: undefined,
        confirmationEmailSubject: undefined,
        confirmationEmailTemplate: undefined,
        thankYouPageUrl: undefined,
        thankYouMessage: undefined,
        conditionalRules: undefined,
        validationRules: undefined,
        customMetadata: undefined,
      };

      const result = await this.formSettingsService.updateFormSettings(
        id,
        defaultSettings,
        adminId
      );

      this.logger.info('Form settings reset to defaults', { adminId, settingsId: id });

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Form settings reset to defaults successfully',
      });
    } catch (error) {
      this.logger.error('Error resetting form settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Export form settings
   * GET /api/v1/form-settings/:id/export
   */
  exportFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.getFormSettingsById(id, adminId);
      if (!result.success || !result.data) {
        throw new AppError('Form settings not found', 404);
      }

      // Remove sensitive/non-exportable fields
      const exportData: any = { ...result.data };
      delete exportData.id;
      delete exportData.formId;
      delete exportData.createdAt;
      delete exportData.updatedAt;

      this.logger.info('Form settings exported', { adminId, settingsId: id });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="form-settings-${id}.json"`);
      res.status(200).json({
        success: true,
        data: exportData,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      });
    } catch (error) {
      this.logger.error('Error exporting form settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Import form settings
   * POST /api/v1/form-settings/:id/import
   */
  importFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { settings } = req.body;

      if (!settings) {
        throw new AppError('Settings data is required', 400);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      // Validate imported settings structure
      const dto = plainToClass(UpdateFormSettingsDto, settings);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new AppError('Invalid settings format', 400, errors);
      }

      const result = await this.formSettingsService.updateFormSettings(id, dto, adminId);

      this.logger.info('Form settings imported', { adminId, settingsId: id });

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Form settings imported successfully',
      });
    } catch (error) {
      this.logger.error('Error importing form settings', error, {
        adminId: req.user?.id,
        id: req.params.id,
        hasSettings: !!req.body.settings,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Get form settings templates
   * GET /api/v1/form-settings/templates
   */
  getFormSettingsTemplates = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const templates = [
        {
          id: 'public-survey',
          name: 'Public Survey',
          description: 'Settings for public surveys with anonymous submissions',
          category: 'survey',
          settings: {
            privacyLevel: 'PUBLIC',
            requireAuthentication: false,
            allowAnonymousSubmissions: true,
            submissionBehavior: 'MULTIPLE',
            showProgressBar: true,
            showSubmissionCounter: true,
            enableCaptcha: true,
            enableRateLimiting: true,
            maxSubmissionsPerMinute: 5,
          },
        },
        {
          id: 'internal-form',
          name: 'Internal Form',
          description: 'Settings for internal company forms',
          category: 'internal',
          settings: {
            privacyLevel: 'RESTRICTED',
            requireAuthentication: true,
            allowAnonymousSubmissions: false,
            submissionBehavior: 'SINGLE',
            enableAuditLog: true,
            logIpAddresses: true,
            showProgressBar: true,
            showRequiredIndicators: true,
          },
        },
        {
          id: 'time-sensitive',
          name: 'Time-Sensitive Form',
          description: 'Settings for forms with strict deadlines',
          category: 'deadline',
          settings: {
            privacyLevel: 'RESTRICTED',
            requireAuthentication: true,
            deadlineAction: 'DISABLE_FORM',
            notifyOnDeadlineApproaching: true,
            deadlineWarningHours: 48,
            gracePeriodHours: 0,
            enableAuditLog: true,
            sendConfirmationEmail: true,
          },
        },
        {
          id: 'high-security',
          name: 'High Security Form',
          description: 'Settings for sensitive data collection',
          category: 'security',
          settings: {
            privacyLevel: 'PRIVATE',
            requireAuthentication: true,
            enableCaptcha: true,
            enableRateLimiting: true,
            maxSubmissionsPerMinute: 3,
            enableEncryption: true,
            enableAuditLog: true,
            logIpAddresses: true,
            requireAllFields: true,
            enableFieldValidation: true,
          },
        },
        {
          id: 'feedback-form',
          name: 'Feedback Form',
          description: 'Settings for customer feedback collection',
          category: 'feedback',
          settings: {
            privacyLevel: 'PUBLIC',
            requireAuthentication: false,
            allowAnonymousSubmissions: true,
            submissionBehavior: 'MULTIPLE',
            showProgressBar: false,
            sendConfirmationEmail: true,
            thankYouMessage: 'Thank you for your feedback!',
            enableCaptcha: true,
          },
        },
      ];

      this.logger.info('Form settings templates requested', { adminId: req.user?.id });

      res.status(200).json({
        success: true,
        data: templates,
        message: 'Form settings templates retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Error retrieving form settings templates', error, {
        adminId: req.user?.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Apply template to form settings
   * POST /api/v1/form-settings/:id/apply-template
   */
  applyTemplate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { templateId } = req.body;

      if (!templateId) {
        throw new AppError('Template ID is required', 400);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      // Get template settings
      const templates: Record<string, any> = {
        'public-survey': {
          privacyLevel: 'PUBLIC',
          requireAuthentication: false,
          allowAnonymousSubmissions: true,
          submissionBehavior: 'MULTIPLE',
          showProgressBar: true,
          showSubmissionCounter: true,
          enableCaptcha: true,
          enableRateLimiting: true,
          maxSubmissionsPerMinute: 5,
        },
        'internal-form': {
          privacyLevel: 'RESTRICTED',
          requireAuthentication: true,
          allowAnonymousSubmissions: false,
          submissionBehavior: 'SINGLE',
          enableAuditLog: true,
          logIpAddresses: true,
          showProgressBar: true,
          showRequiredIndicators: true,
        },
        'time-sensitive': {
          privacyLevel: 'RESTRICTED',
          requireAuthentication: true,
          deadlineAction: 'DISABLE_FORM',
          notifyOnDeadlineApproaching: true,
          deadlineWarningHours: 48,
          gracePeriodHours: 0,
          enableAuditLog: true,
          sendConfirmationEmail: true,
        },
        'high-security': {
          privacyLevel: 'PRIVATE',
          requireAuthentication: true,
          enableCaptcha: true,
          enableRateLimiting: true,
          maxSubmissionsPerMinute: 3,
          enableEncryption: true,
          enableAuditLog: true,
          logIpAddresses: true,
          requireAllFields: true,
          enableFieldValidation: true,
        },
        'feedback-form': {
          privacyLevel: 'PUBLIC',
          requireAuthentication: false,
          allowAnonymousSubmissions: true,
          submissionBehavior: 'MULTIPLE',
          showProgressBar: false,
          sendConfirmationEmail: true,
          thankYouMessage: 'Thank you for your feedback!',
          enableCaptcha: true,
        },
      };

      const templateSettings = templates[templateId];
      if (!templateSettings) {
        throw new AppError('Template not found', 404);
      }

      const result = await this.formSettingsService.updateFormSettings(
        id,
        templateSettings,
        adminId
      );

      this.logger.info('Template applied to form settings', {
        adminId,
        settingsId: id,
        templateId,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        message: `Template "${templateId}" applied successfully`,
      });
    } catch (error) {
      this.logger.error('Error applying template', error, {
        adminId: req.user?.id,
        id: req.params.id,
        templateId: req.body.templateId,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Validate form settings configuration
   * POST /api/v1/form-settings/validate
   */
  validateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = plainToClass(CreateFormSettingsDto, req.body);
      const errors = await validate(dto);

      const validation = {
        isValid: errors.length === 0,
        errors: errors.map(error => ({
          field: error.property,
          constraints: error.constraints,
          value: error.value,
        })),
        warnings: [] as string[],
        suggestions: [] as string[],
      };

      // Add custom validation warnings and suggestions
      if (dto.enableCaptcha && dto.allowAnonymousSubmissions) {
        validation.suggestions.push('CAPTCHA is recommended for anonymous submissions');
      }

      if (dto.submissionDeadline && !dto.notifyOnDeadlineApproaching) {
        validation.warnings.push(
          'Consider enabling deadline notifications for time-sensitive forms'
        );
      }

      if (dto.privacyLevel === 'PUBLIC' && !dto.enableRateLimiting) {
        validation.warnings.push('Rate limiting is recommended for public forms');
      }

      if (dto.privacyLevel === 'PUBLIC' && !dto.enableCaptcha) {
        validation.warnings.push('CAPTCHA is strongly recommended for public forms');
      }

      if (dto.enableEncryption && dto.privacyLevel === 'PUBLIC') {
        validation.suggestions.push(
          'Encryption is excellent for public forms handling sensitive data'
        );
      }

      if (dto.logIpAddresses && dto.allowAnonymousSubmissions) {
        validation.warnings.push('IP logging may compromise anonymity claims');
      }

      if (dto.maxSubmissions && dto.submissionBehavior === 'SINGLE') {
        validation.warnings.push(
          'Max submissions setting is redundant with single submission behavior'
        );
      }

      this.logger.info('Settings validation performed', {
        adminId: req.user?.id,
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      });

      res.status(200).json({
        success: true,
        data: validation,
        message: 'Settings validation completed',
      });
    } catch (error) {
      this.logger.error('Error validating settings', error, { adminId: req.user?.id });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Bulk update multiple form settings
   * PATCH /api/v1/form-settings/bulk
   */
  bulkUpdateFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { settingsIds, updates } = req.body;

      if (!settingsIds || !Array.isArray(settingsIds) || settingsIds.length === 0) {
        throw new AppError('Settings IDs array is required', 400);
      }

      if (!updates || typeof updates !== 'object') {
        throw new AppError('Updates object is required', 400);
      }

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      // Validate updates structure
      const dto = plainToClass(UpdateFormSettingsDto, updates);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new AppError('Invalid updates format', 400, errors);
      }

      const results = [];
      const failures = [];

      // Update each settings individually to maintain authorization checks
      for (const settingsId of settingsIds) {
        try {
          const result = await this.formSettingsService.updateFormSettings(
            settingsId,
            dto,
            adminId
          );
          results.push({
            settingsId,
            success: true,
            data: result.data,
          });
        } catch (error) {
          failures.push({
            settingsId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.logger.info('Bulk update completed', {
        adminId,
        totalRequested: settingsIds.length,
        successful: results.length,
        failed: failures.length,
      });

      res.status(200).json({
        success: true,
        data: {
          successful: results,
          failed: failures,
          summary: {
            total: settingsIds.length,
            successful: results.length,
            failed: failures.length,
          },
        },
        message: `Bulk update completed: ${results.length} successful, ${failures.length} failed`,
      });
    } catch (error) {
      this.logger.error('Error in bulk update', error, { adminId: req.user?.id });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Get form settings audit log
   * GET /api/v1/form-settings/:id/audit-log
   */
  getFormSettingsAuditLog = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 50, page = 1 } = req.query;

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      // Verify the user has access to this form settings
      await this.formSettingsService.getFormSettingsById(id, adminId);

      // Get audit logs from audit service
      const auditLogs = await this.formSettingsService['auditLogService'].getAuditLogs(
        'FormSettings',
        id,
        undefined,
        parseInt(limit as string)
      );

      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedLogs = auditLogs.slice(startIndex, endIndex);

      this.logger.info('Audit log retrieved', {
        adminId,
        settingsId: id,
        logCount: auditLogs.length,
      });

      res.status(200).json({
        success: true,
        data: {
          logs: paginatedLogs,
          pagination: {
            total: auditLogs.length,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(auditLogs.length / parseInt(limit as string)),
          },
        },
        message: 'Audit log retrieved successfully',
      });
    } catch (error) {
      this.logger.error('Error retrieving audit log', error, {
        adminId: req.user?.id,
        settingsId: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Test form settings configuration
   * POST /api/v1/form-settings/:id/test
   */
  testFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { testType = 'all' } = req.body;

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const settingsResult = await this.formSettingsService.getFormSettingsById(id, adminId);
      if (!settingsResult.success || !settingsResult.data) {
        throw new AppError('Form settings not found', 404);
      }

      const settings = settingsResult.data;
      const testResults = {
        overall: 'passed' as 'passed' | 'failed' | 'warning',
        tests: [] as any[],
        recommendations: [] as string[],
      };

      // Test access control
      if (testType === 'all' || testType === 'access') {
        const accessTest = {
          name: 'Access Control',
          status: 'passed' as 'passed' | 'failed' | 'warning',
          details: [] as string[],
        };

        if (settings.privacyLevel === 'PUBLIC' && settings.requireAuthentication) {
          accessTest.status = 'warning';
          accessTest.details.push('Public form requires authentication - this may confuse users');
        }

        if (settings.allowAnonymousSubmissions && settings.logIpAddresses) {
          accessTest.status = 'warning';
          accessTest.details.push('Anonymous submissions with IP logging may compromise anonymity');
        }

        testResults.tests.push(accessTest);
      }

      // Test deadlines
      if (testType === 'all' || testType === 'deadlines') {
        const deadlineTest = {
          name: 'Deadline Configuration',
          status: 'passed' as 'passed' | 'failed' | 'warning',
          details: [] as string[],
        };

        if (settings.submissionDeadline) {
          const now = new Date();
          const deadline = new Date(settings.submissionDeadline);

          if (deadline < now) {
            deadlineTest.status = 'failed';
            deadlineTest.details.push('Submission deadline has already passed');
          } else if (deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
            deadlineTest.status = 'warning';
            deadlineTest.details.push('Submission deadline is less than 24 hours away');
          }

          if (settings.startDate && new Date(settings.startDate) >= deadline) {
            deadlineTest.status = 'failed';
            deadlineTest.details.push('Start date must be before submission deadline');
          }
        }

        testResults.tests.push(deadlineTest);
      }

      // Test notifications
      if (testType === 'all' || testType === 'notifications') {
        const notificationTest = {
          name: 'Notification Configuration',
          status: 'passed' as 'passed' | 'failed' | 'warning',
          details: [] as string[],
        };

        if (
          settings.notifyOnSubmission &&
          (!settings.notificationEmails || settings.notificationEmails.length === 0)
        ) {
          notificationTest.status = 'warning';
          notificationTest.details.push(
            'Submission notifications enabled but no email addresses configured'
          );
        }

        if (settings.webhookUrl) {
          try {
            new URL(settings.webhookUrl);
          } catch (error) {
            notificationTest.status = 'failed';
            notificationTest.details.push('Webhook URL is not valid');
          }
        }

        testResults.tests.push(notificationTest);
      }

      // Test security
      if (testType === 'all' || testType === 'security') {
        const securityTest = {
          name: 'Security Configuration',
          status: 'passed' as 'passed' | 'failed' | 'warning',
          details: [] as string[],
        };

        if (settings.privacyLevel === 'PUBLIC') {
          if (!settings.enableCaptcha) {
            securityTest.status = 'warning';
            securityTest.details.push('Public forms should enable CAPTCHA to prevent spam');
          }

          if (!settings.enableRateLimiting) {
            securityTest.status = 'warning';
            securityTest.details.push('Public forms should enable rate limiting');
          }
        }

        if (settings.enableRateLimiting && settings.maxSubmissionsPerMinute > 10) {
          securityTest.status = 'warning';
          securityTest.details.push('High rate limit may not effectively prevent spam');
        }

        testResults.tests.push(securityTest);
      }

      // Determine overall status
      const hasFailures = testResults.tests.some(test => test.status === 'failed');
      const hasWarnings = testResults.tests.some(test => test.status === 'warning');

      if (hasFailures) {
        testResults.overall = 'failed';
      } else if (hasWarnings) {
        testResults.overall = 'warning';
      }

      // Add recommendations
      if (settings.privacyLevel === 'PUBLIC') {
        testResults.recommendations.push(
          'Consider adding confirmation email for better user experience'
        );
        testResults.recommendations.push(
          'Review collected data to ensure compliance with privacy regulations'
        );
      }

      if (settings.submissionDeadline && !settings.sendConfirmationEmail) {
        testResults.recommendations.push('Enable confirmation emails for time-sensitive forms');
      }

      this.logger.info('Form settings test completed', {
        adminId,
        settingsId: id,
        testType,
        overall: testResults.overall,
        testCount: testResults.tests.length,
      });

      res.status(200).json({
        success: true,
        data: testResults,
        message: 'Form settings test completed',
      });
    } catch (error) {
      this.logger.error('Error testing form settings', error, {
        adminId: req.user?.id,
        settingsId: req.params.id,
        testType: req.body.testType,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Preview form with current settings
   * GET /api/v1/form-settings/:id/preview
   */
  previewFormSettings = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.formSettingsService.getFormSettingsById(id, adminId);
      if (!result.success || !result.data) {
        throw new AppError('Form settings not found', 404);
      }

      const settings = result.data;

      // Generate preview data based on settings
      const preview = {
        formAccess: await this.formSettingsService.checkFormAccess(settings.formId),
        displayConfig: {
          showProgressBar: settings.showProgressBar,
          showSubmissionCounter: settings.showSubmissionCounter,
          showRequiredIndicators: settings.showRequiredIndicators,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          logoUrl: settings.logoUrl,
          customCss: settings.customCss,
        },
        securityFeatures: {
          requiresAuthentication: settings.requireAuthentication,
          hasCaptcha: settings.enableCaptcha,
          hasRateLimit: settings.enableRateLimiting,
          isEncrypted: settings.enableEncryption,
        },
        submissionRules: {
          behavior: settings.submissionBehavior,
          maxSubmissions: settings.maxSubmissions,
          allowDrafts: settings.allowDraftSave,
          requireAllFields: settings.requireAllFields,
        },
        notifications: {
          confirmationEmail: settings.sendConfirmationEmail,
          thankYouMessage: settings.thankYouMessage,
          thankYouPageUrl: settings.thankYouPageUrl,
        },
        deadlines: settings.submissionDeadline
          ? {
              deadline: settings.submissionDeadline,
              startDate: settings.startDate,
              gracePeriod: settings.gracePeriodHours,
              action: settings.deadlineAction,
              message: settings.deadlineMessage,
            }
          : null,
      };

      this.logger.info('Form settings preview generated', { adminId, settingsId: id });

      res.status(200).json({
        success: true,
        data: preview,
        message: 'Form preview generated successfully',
      });
    } catch (error) {
      this.logger.error('Error generating form preview', error, {
        adminId: req.user?.id,
        settingsId: req.params.id,
      });
      ResponseHelper.error(res, error.message, 400);
    }
  };
}
