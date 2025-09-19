// dtos/form-settings.dtos.ts
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  DeadlineAction,
  NotificationType,
  PrivacyLevel,
  SubmissionBehavior,
} from '../../../database/entities/form-settings.entity';

/**
 * DTO for creating new form settings
 */
export class CreateFormSettingsDto {
  @IsUUID('4', { message: 'Form ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Form ID is required' })
  formId!: string;

  // Privacy & Access Settings
  @IsOptional()
  @IsEnum(PrivacyLevel, {
    message: 'Invalid privacy level. Must be: PUBLIC, RESTRICTED, PRIVATE, or ANONYMOUS',
  })
  privacyLevel?: PrivacyLevel;

  @IsOptional()
  @IsBoolean({ message: 'requireAuthentication must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  requireAuthentication?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'allowAnonymousSubmissions must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  allowAnonymousSubmissions?: boolean;

  @IsOptional()
  @IsArray({ message: 'allowedDomains must be an array' })
  @IsString({ each: true, message: 'Each domain must be a string' })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  allowedDomains?: string[];

  @IsOptional()
  @IsArray({ message: 'allowedUsers must be an array' })
  @IsUUID('4', { each: true, message: 'Each user ID must be a valid UUID' })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  allowedUsers?: string[];

  @IsOptional()
  @IsArray({ message: 'allowedRoles must be an array' })
  @IsString({ each: true, message: 'Each role must be a string' })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  allowedRoles?: string[];

  // Submission Settings
  @IsOptional()
  @IsEnum(SubmissionBehavior, {
    message: 'Invalid submission behavior. Must be: SINGLE, MULTIPLE, DAILY, WEEKLY, or MONTHLY',
  })
  submissionBehavior?: SubmissionBehavior;

  @IsOptional()
  @IsInt({ message: 'maxSubmissions must be an integer' })
  @Min(1, { message: 'maxSubmissions must be at least 1' })
  @Max(10000, { message: 'maxSubmissions cannot exceed 10,000' })
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  maxSubmissions?: number;

  @IsOptional()
  @IsInt({ message: 'maxSubmissionsPerUser must be an integer' })
  @Min(1, { message: 'maxSubmissionsPerUser must be at least 1' })
  @Max(100, { message: 'maxSubmissionsPerUser cannot exceed 100' })
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  maxSubmissionsPerUser?: number;

  @IsOptional()
  @IsBoolean({ message: 'allowDraftSave must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  allowDraftSave?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'requireAllFields must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  requireAllFields?: boolean;

  // Deadline Settings
  @IsOptional()
  @IsDateString({}, { message: 'submissionDeadline must be a valid ISO date string' })
  submissionDeadline?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @IsOptional()
  @IsEnum(DeadlineAction, {
    message:
      'Invalid deadline action. Must be: DISABLE_FORM, SHOW_MESSAGE, REDIRECT, or ALLOW_LATE_SUBMISSIONS',
  })
  deadlineAction?: DeadlineAction;

  @IsOptional()
  @IsString({ message: 'deadlineMessage must be a string' })
  @Length(0, 1000, { message: 'deadlineMessage must be less than 1000 characters' })
  deadlineMessage?: string;

  @ValidateIf(o => o.deadlineAction === 'REDIRECT')
  @IsUrl({}, { message: 'redirectUrl must be a valid URL when deadline action is REDIRECT' })
  @Length(0, 500, { message: 'redirectUrl must be less than 500 characters' })
  redirectUrl?: string;

  @IsOptional()
  @IsInt({ message: 'gracePeriodHours must be an integer' })
  @Min(0, { message: 'gracePeriodHours cannot be negative' })
  @Max(168, { message: 'gracePeriodHours cannot exceed 7 days (168 hours)' })
  @Transform(({ value }) => (value ? parseInt(value) : 0))
  gracePeriodHours?: number;

  // Notification Settings
  @IsOptional()
  @IsArray({ message: 'notificationTypes must be an array' })
  @IsEnum(NotificationType, { each: true, message: 'Invalid notification type' })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  notificationTypes?: NotificationType[];

  @IsOptional()
  @IsBoolean({ message: 'notifyOnSubmission must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  notifyOnSubmission?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'notifyOnDeadlineApproaching must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  notifyOnDeadlineApproaching?: boolean;

  @IsOptional()
  @IsInt({ message: 'deadlineWarningHours must be an integer' })
  @Min(1, { message: 'deadlineWarningHours must be at least 1' })
  @Max(168, { message: 'deadlineWarningHours cannot exceed 7 days (168 hours)' })
  @Transform(({ value }) => (value ? parseInt(value) : 24))
  deadlineWarningHours?: number;

  @IsOptional()
  @IsArray({ message: 'notificationEmails must be an array' })
  @IsEmail({}, { each: true, message: 'Each notification email must be valid' })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  notificationEmails?: string[];

  @IsOptional()
  @IsUrl({}, { message: 'webhookUrl must be a valid URL' })
  @Length(0, 500, { message: 'webhookUrl must be less than 500 characters' })
  webhookUrl?: string;

  // Display Settings
  @IsOptional()
  @IsBoolean({ message: 'showProgressBar must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  showProgressBar?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'showSubmissionCounter must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  showSubmissionCounter?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'showRequiredIndicators must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  showRequiredIndicators?: boolean;

  @IsOptional()
  @IsString({ message: 'customCss must be a string' })
  @Length(0, 5000, { message: 'customCss must be less than 5000 characters' })
  customCss?: string;

  @IsOptional()
  @IsString({ message: 'customJavaScript must be a string' })
  @Length(0, 2000, { message: 'customJavaScript must be less than 2000 characters' })
  customJavaScript?: string;

  @IsOptional()
  @IsUrl({}, { message: 'logoUrl must be a valid URL' })
  @Length(0, 500, { message: 'logoUrl must be less than 500 characters' })
  logoUrl?: string;

  @IsOptional()
  @IsHexColor({ message: 'primaryColor must be a valid hex color (e.g., #FF0000)' })
  primaryColor?: string;

  @IsOptional()
  @IsHexColor({ message: 'secondaryColor must be a valid hex color (e.g., #FF0000)' })
  secondaryColor?: string;

  // Security Settings
  @IsOptional()
  @IsBoolean({ message: 'enableCaptcha must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  enableCaptcha?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'enableRateLimiting must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  enableRateLimiting?: boolean;

  @IsOptional()
  @IsInt({ message: 'maxSubmissionsPerMinute must be an integer' })
  @Min(1, { message: 'maxSubmissionsPerMinute must be at least 1' })
  @Max(1000, { message: 'maxSubmissionsPerMinute cannot exceed 1000' })
  @Transform(({ value }) => (value ? parseInt(value) : 10))
  maxSubmissionsPerMinute?: number;

  @IsOptional()
  @IsBoolean({ message: 'logIpAddresses must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  logIpAddresses?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'enableEncryption must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  enableEncryption?: boolean;

  // Auto-response Settings
  @IsOptional()
  @IsBoolean({ message: 'sendConfirmationEmail must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  sendConfirmationEmail?: boolean;

  @ValidateIf(o => o.sendConfirmationEmail === true)
  @IsString({ message: 'confirmationEmailSubject is required when confirmation email is enabled' })
  @Length(1, 200, { message: 'confirmationEmailSubject must be between 1 and 200 characters' })
  confirmationEmailSubject?: string;

  @IsOptional()
  @IsString({ message: 'confirmationEmailTemplate must be a string' })
  @Length(0, 5000, { message: 'confirmationEmailTemplate must be less than 5000 characters' })
  confirmationEmailTemplate?: string;

  @IsOptional()
  @IsUrl({}, { message: 'thankYouPageUrl must be a valid URL' })
  @Length(0, 500, { message: 'thankYouPageUrl must be less than 500 characters' })
  thankYouPageUrl?: string;

  @IsOptional()
  @IsString({ message: 'thankYouMessage must be a string' })
  @Length(0, 1000, { message: 'thankYouMessage must be less than 1000 characters' })
  thankYouMessage?: string;

  // Advanced Settings
  @IsOptional()
  @IsBoolean({ message: 'enableConditionalLogic must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  enableConditionalLogic?: boolean;

  @IsOptional()
  @IsObject({ message: 'conditionalRules must be an object' })
  conditionalRules?: any;

  @IsOptional()
  @IsBoolean({ message: 'enableFieldValidation must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  enableFieldValidation?: boolean;

  @IsOptional()
  @IsObject({ message: 'validationRules must be an object' })
  validationRules?: any;

  @IsOptional()
  @IsInt({ message: 'autoSaveInterval must be an integer' })
  @Min(1, { message: 'autoSaveInterval must be at least 1 minute' })
  @Max(60, { message: 'autoSaveInterval cannot exceed 60 minutes' })
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  autoSaveInterval?: number;

  @IsOptional()
  @IsBoolean({ message: 'enableAuditLog must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  enableAuditLog?: boolean;

  @IsOptional()
  @IsObject({ message: 'customMetadata must be an object' })
  customMetadata?: any;
}

/**
 * DTO for updating form settings (all fields optional)
 */
export class UpdateFormSettingsDto {
  @IsOptional()
  @IsEnum(PrivacyLevel, { message: 'Invalid privacy level' })
  privacyLevel?: PrivacyLevel;

  @IsOptional()
  @IsBoolean({ message: 'requireAuthentication must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  requireAuthentication?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'allowAnonymousSubmissions must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  allowAnonymousSubmissions?: boolean;

  @IsOptional()
  @IsArray({ message: 'allowedDomains must be an array' })
  @IsString({ each: true, message: 'Each domain must be a string' })
  allowedDomains?: string[];

  @IsOptional()
  @IsArray({ message: 'allowedUsers must be an array' })
  @IsUUID('4', { each: true, message: 'Each user ID must be a valid UUID' })
  allowedUsers?: string[];

  @IsOptional()
  @IsArray({ message: 'allowedRoles must be an array' })
  @IsString({ each: true, message: 'Each role must be a string' })
  allowedRoles?: string[];

  @IsOptional()
  @IsEnum(SubmissionBehavior, { message: 'Invalid submission behavior' })
  submissionBehavior?: SubmissionBehavior;

  @IsOptional()
  @IsInt({ message: 'maxSubmissions must be an integer' })
  @Min(1, { message: 'maxSubmissions must be at least 1' })
  @Max(10000, { message: 'maxSubmissions cannot exceed 10,000' })
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  maxSubmissions?: number;

  @IsOptional()
  @IsInt({ message: 'maxSubmissionsPerUser must be an integer' })
  @Min(1, { message: 'maxSubmissionsPerUser must be at least 1' })
  @Max(100, { message: 'maxSubmissionsPerUser cannot exceed 100' })
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  maxSubmissionsPerUser?: number;

  @IsOptional()
  @IsBoolean({ message: 'allowDraftSave must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  allowDraftSave?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'requireAllFields must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  requireAllFields?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'submissionDeadline must be a valid date' })
  submissionDeadline?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid date' })
  startDate?: string;

  @IsOptional()
  @IsEnum(DeadlineAction, { message: 'Invalid deadline action' })
  deadlineAction!: DeadlineAction;

  @IsOptional()
  @IsString({ message: 'deadlineMessage must be a string' })
  @Length(0, 1000)
  deadlineMessage?: string;

  @ValidateIf(o => o.deadlineAction === 'REDIRECT')
  @IsUrl({}, { message: 'redirectUrl must be a valid URL when deadline action is REDIRECT' })
  redirectUrl?: string;

  @IsInt({ message: 'gracePeriodHours must be an integer' })
  @Min(0)
  @Max(168)
  @Transform(({ value }) => parseInt(value) || 0)
  gracePeriodHours!: number;
}

/**
 * DTO for updating notification settings only
 */
export class NotificationSettingsDto {
  @IsArray({ message: 'notificationTypes must be an array' })
  @IsEnum(NotificationType, { each: true })
  notificationTypes!: NotificationType[];

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  notifyOnSubmission!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  notifyOnDeadlineApproaching!: boolean;

  @IsInt()
  @Min(1)
  @Max(168)
  @Transform(({ value }) => parseInt(value) || 24)
  deadlineWarningHours!: number;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notificationEmails?: string[];

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;
}

/**
 * DTO for updating display settings only
 */
export class DisplaySettingsDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  showProgressBar!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  showSubmissionCounter!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  showRequiredIndicators!: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  customCss?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  customJavaScript?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsHexColor()
  primaryColor!: string;

  @IsHexColor()
  secondaryColor!: string;
}

/**
 * DTO for updating security settings only
 */
export class SecuritySettingsDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableCaptcha!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableRateLimiting!: boolean;

  @IsInt()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value) || 10)
  maxSubmissionsPerMinute!: number;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  logIpAddresses!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enableEncryption!: boolean;
}

/**
 * DTO for updating submission behavior settings
 */
export class SubmissionSettingsDto {
  @IsEnum(SubmissionBehavior, { message: 'Invalid submission behavior' })
  submissionBehavior!: SubmissionBehavior;

  @IsOptional()
  @IsInt({ message: 'maxSubmissions must be an integer' })
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  maxSubmissions?: number;

  @IsOptional()
  @IsInt({ message: 'maxSubmissionsPerUser must be an integer' })
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  maxSubmissionsPerUser?: number;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allowDraftSave!: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requireAllFields!: boolean;
}

/**
 * DTO for updating auto-response settings
 */
export class AutoResponseSettingsDto {
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  sendConfirmationEmail!: boolean;

  @ValidateIf(o => o.sendConfirmationEmail === true)
  @IsString({ message: 'confirmationEmailSubject is required when confirmation email is enabled' })
  @Length(1, 200)
  confirmationEmailSubject?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  confirmationEmailTemplate?: string;

  @IsOptional()
  @IsUrl()
  thankYouPageUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  thankYouMessage?: string;
}

/**
 * DTO for bulk operations
 */
export class BulkUpdateFormSettingsDto {
  @IsArray({ message: 'settingsIds must be an array' })
  @ArrayNotEmpty({ message: 'settingsIds array cannot be empty' })
  @IsUUID('4', { each: true, message: 'Each settings ID must be a valid UUID' })
  settingsIds!: string[];

  @ValidateNested()
  @Type(() => UpdateFormSettingsDto)
  updates!: UpdateFormSettingsDto;
}

/**
 * DTO for cloning form settings
 */
export class CloneFormSettingsDto {
  @IsUUID('4', { message: 'Target form ID must be a valid UUID' })
  targetFormId!: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeNotificationSettings?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeadlineSettings?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAccessControlSettings?: boolean = true;
}

/**
 * DTO for applying templates
 */
export class ApplyTemplateDto {
  @IsString({ message: 'Template ID is required' })
  @IsNotEmpty({ message: 'Template ID cannot be empty' })
  @Matches(/^(public-survey|internal-form|time-sensitive|high-security|feedback-form)$/, {
    message: 'Invalid template ID',
  })
  templateId!: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  mergeWithExisting?: boolean = false;
}

/**
 * DTO for importing form settings
 */
export class ImportFormSettingsDto {
  @ValidateNested()
  @Type(() => UpdateFormSettingsDto)
  settings!: UpdateFormSettingsDto;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  validateOnly?: boolean = false;
}

/**
 * DTO for form settings validation
 */
export class ValidateFormSettingsDto extends CreateFormSettingsDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  checkConflicts?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeWarnings?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSuggestions?: boolean = true;
}

/**
 * DTO for testing form settings
 */
export class TestFormSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^(all|access|deadlines|notifications|security|display)$/, {
    message: 'testType must be one of: all, access, deadlines, notifications, security, display',
  })
  testType?: string = 'all';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRecommendations?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  checkCompatibility?: boolean = true;
}

/**
 * Response DTOs
 */
export class FormSettingsValidationResultDto {
  isValid!: boolean;
  errors!: Array<{
    field: string;
    constraints: Record<string, string>;
    value: any;
  }>;
  warnings!: string[];
  suggestions!: string[];
}

export class FormSettingsTestResultDto {
  overall!: 'passed' | 'failed' | 'warning';
  tests!: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    details: string[];
  }>;
  recommendations!: string[];
}

export class BulkOperationResultDto {
  successful!: Array<{
    settingsId: string;
    success: boolean;
    data: any;
  }>;
  failed!: Array<{
    settingsId: string;
    success: boolean;
    error: string;
  }>;
  summary!: {
    total: number;
    successful: number;
    failed: number;
  };
}

export class FormSettingsStatsFilterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value) || 30)
  days?: number = 30;

  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacyLevel?: PrivacyLevel;

  @IsOptional()
  @IsEnum(SubmissionBehavior)
  submissionBehavior?: SubmissionBehavior;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean = false;
}

/**
 * DTO for querying form settings with filters and pagination
 */
export class QueryFormSettingsDto {
  @IsOptional()
  @IsUUID('4', { message: 'Form ID must be a valid UUID' })
  formId?: string;

  @IsOptional()
  @IsEnum(PrivacyLevel, { message: 'Invalid privacy level' })
  privacyLevel?: PrivacyLevel;

  @IsOptional()
  @IsEnum(SubmissionBehavior, { message: 'Invalid submission behavior' })
  submissionBehavior?: SubmissionBehavior;

  @IsOptional()
  @IsEnum(DeadlineAction, { message: 'Invalid deadline action' })
  deadlineAction?: DeadlineAction;

  @IsOptional()
  @IsBoolean({ message: 'enableCaptcha must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  enableCaptcha?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'enableRateLimiting must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  enableRateLimiting?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'requireAuthentication must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  requireAuthentication?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'allowAnonymousSubmissions must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  allowAnonymousSubmissions?: boolean;

  // Pagination
  @IsOptional()
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => parseInt(value) || 20)
  limit?: number = 20;

  // Sorting
  @IsOptional()
  @IsString({ message: 'sortBy must be a string' })
  @Matches(/^(createdAt|updatedAt|privacyLevel|submissionBehavior|deadlineAction)$/, {
    message:
      'sortBy must be one of: createdAt, updatedAt, privacyLevel, submissionBehavior, deadlineAction',
  })
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  // Date filters
  @IsOptional()
  @IsDateString({}, { message: 'createdAfter must be a valid date' })
  createdAfter?: string;

  @IsOptional()
  @IsDateString({}, { message: 'createdBefore must be a valid date' })
  createdBefore?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hasDeadlineAfter must be a valid date' })
  hasDeadlineAfter?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hasDeadlineBefore must be a valid date' })
  hasDeadlineBefore?: string;
}

// Specialized DTOs for specific settings sections

/**
 * DTO for updating access control settings only
 */
export class AccessControlDto {
  @IsEnum(PrivacyLevel, { message: 'Invalid privacy level' })
  privacyLevel!: PrivacyLevel;

  @IsBoolean({ message: 'requireAuthentication must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  requireAuthentication!: boolean;

  @IsBoolean({ message: 'allowAnonymousSubmissions must be a boolean' })
  @Transform(({ value }) => value === 'true' || value === true)
  allowAnonymousSubmissions!: boolean;

  @IsOptional()
  @IsArray({ message: 'allowedDomains must be an array' })
  @IsString({ each: true })
  allowedDomains?: string[];

  @IsOptional()
  @IsArray({ message: 'allowedUsers must be an array' })
  @IsUUID('4', { each: true })
  allowedUsers?: string[];

  @IsOptional()
  @IsArray({ message: 'allowedRoles must be an array' })
  @IsString({ each: true })
  allowedRoles?: string[];
}

/**
 * Search and filter DTOs
 */
export class FormSettingsSearchDto extends QueryFormSettingsDto {
  @IsOptional()
  @IsString()
  @Length(3, 100, { message: 'Search query must be between 3 and 100 characters' })
  query?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchFields?: string[] = ['formId', 'privacyLevel', 'submissionBehavior'];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  exactMatch?: boolean = false;
}
