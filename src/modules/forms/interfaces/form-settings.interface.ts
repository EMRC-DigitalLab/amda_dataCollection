import {
  DeadlineAction,
  NotificationType,
  PrivacyLevel,
  SubmissionBehavior,
} from '../../../database/entities/form-settings.entity';

export interface IFormSettings {
  id: string;
  formId: string;

  // Privacy & Access
  privacyLevel: PrivacyLevel;
  requireAuthentication: boolean;
  allowAnonymousSubmissions: boolean;
  allowedDomains?: string[];
  allowedUsers?: string[];
  allowedRoles?: string[];

  // Submissions
  submissionBehavior: SubmissionBehavior;
  maxSubmissions?: number;
  maxSubmissionsPerUser?: number;
  allowDraftSave: boolean;
  requireAllFields: boolean;

  // Deadlines
  submissionDeadline?: Date;
  startDate?: Date;
  deadlineAction: DeadlineAction;
  deadlineMessage?: string;
  redirectUrl?: string;
  gracePeriodHours: number;

  // Notifications
  notificationTypes?: NotificationType[];
  notifyOnSubmission: boolean;
  notifyOnDeadlineApproaching: boolean;
  deadlineWarningHours: number;
  notificationEmails?: string[];
  webhookUrl?: string;

  // Display
  showProgressBar: boolean;
  showSubmissionCounter: boolean;
  showRequiredIndicators: boolean;
  customCss?: string;
  customJavaScript?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;

  // Security
  enableCaptcha: boolean;
  enableRateLimiting: boolean;
  maxSubmissionsPerMinute: number;
  logIpAddresses: boolean;
  enableEncryption: boolean;

  // Auto-response
  sendConfirmationEmail: boolean;
  confirmationEmailSubject?: string;
  confirmationEmailTemplate?: string;
  thankYouPageUrl?: string;
  thankYouMessage?: string;

  // Advanced
  enableConditionalLogic: boolean;
  conditionalRules?: any;
  enableFieldValidation: boolean;
  validationRules?: any;
  autoSaveInterval?: number;
  enableAuditLog: boolean;
  customMetadata?: any;

  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateFormSettings {
  formId: string;
  privacyLevel?: PrivacyLevel;
  requireAuthentication?: boolean;
  allowAnonymousSubmissions?: boolean;
  allowedDomains?: string[];
  allowedUsers?: string[];
  allowedRoles?: string[];
  submissionBehavior?: SubmissionBehavior;
  maxSubmissions?: number;
  maxSubmissionsPerUser?: number;
  allowDraftSave?: boolean;
  requireAllFields?: boolean;
  submissionDeadline?: Date;
  startDate?: Date;
  deadlineAction?: DeadlineAction;
  deadlineMessage?: string;
  redirectUrl?: string;
  gracePeriodHours?: number;
  notificationTypes?: NotificationType[];
  notifyOnSubmission?: boolean;
  notifyOnDeadlineApproaching?: boolean;
  deadlineWarningHours?: number;
  notificationEmails?: string[];
  webhookUrl?: string;
  showProgressBar?: boolean;
  showSubmissionCounter?: boolean;
  showRequiredIndicators?: boolean;
  customCss?: string;
  customJavaScript?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  enableCaptcha?: boolean;
  enableRateLimiting?: boolean;
  maxSubmissionsPerMinute?: number;
  logIpAddresses?: boolean;
  enableEncryption?: boolean;
  sendConfirmationEmail?: boolean;
  confirmationEmailSubject?: string;
  confirmationEmailTemplate?: string;
  thankYouPageUrl?: string;
  thankYouMessage?: string;
  enableConditionalLogic?: boolean;
  conditionalRules?: any;
  enableFieldValidation?: boolean;
  validationRules?: any;
  autoSaveInterval?: number;
  enableAuditLog?: boolean;
  customMetadata?: any;
}

export interface IUpdateFormSettings extends Partial<ICreateFormSettings> {
  id?: string;
}

export interface IFormSettingsQuery {
  formId?: string;
  privacyLevel?: PrivacyLevel;
  submissionBehavior?: SubmissionBehavior;
  deadlineAction?: DeadlineAction;
  enableCaptcha?: boolean;
  enableRateLimiting?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IFormSettingsResponse {
  success: boolean;
  data?: IFormSettings;
  message?: string;
  errors?: any;
}

export interface IFormSettingsListResponse {
  success: boolean;
  data?: {
    settings: IFormSettings[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
  errors?: any;
}

// Utility interfaces for specific use cases
export interface IAccessControl {
  privacyLevel: PrivacyLevel;
  requireAuthentication: boolean;
  allowAnonymousSubmissions: boolean;
  allowedDomains?: string[];
  allowedUsers?: string[];
  allowedRoles?: string[];
}

export interface ISubmissionControl {
  submissionBehavior: SubmissionBehavior;
  maxSubmissions?: number;
  maxSubmissionsPerUser?: number;
  allowDraftSave: boolean;
  requireAllFields: boolean;
}

export interface IDeadlineSettings {
  submissionDeadline?: Date;
  startDate?: Date;
  deadlineAction: DeadlineAction;
  deadlineMessage?: string;
  redirectUrl?: string;
  gracePeriodHours: number;
}

export interface INotificationSettings {
  notificationTypes?: NotificationType[];
  notifyOnSubmission: boolean;
  notifyOnDeadlineApproaching: boolean;
  deadlineWarningHours: number;
  notificationEmails?: string[];
  webhookUrl?: string;
}

export interface IDisplaySettings {
  showProgressBar: boolean;
  showSubmissionCounter: boolean;
  showRequiredIndicators: boolean;
  customCss?: string;
  customJavaScript?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface ISecuritySettings {
  enableCaptcha: boolean;
  enableRateLimiting: boolean;
  maxSubmissionsPerMinute: number;
  logIpAddresses: boolean;
  enableEncryption: boolean;
}

export interface IAutoResponseSettings {
  sendConfirmationEmail: boolean;
  confirmationEmailSubject?: string;
  confirmationEmailTemplate?: string;
  thankYouPageUrl?: string;
  thankYouMessage?: string;
}

export interface IAdvancedSettings {
  enableConditionalLogic: boolean;
  conditionalRules?: any;
  enableFieldValidation: boolean;
  validationRules?: any;
  autoSaveInterval?: number;
  enableAuditLog: boolean;
  customMetadata?: any;
}
