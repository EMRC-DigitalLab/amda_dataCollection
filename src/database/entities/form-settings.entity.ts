// form-settings.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Form } from './form.entity';

export enum PrivacyLevel {
  PUBLIC = 'PUBLIC', // Anyone can access
  RESTRICTED = 'RESTRICTED', // Only specific users/groups
  PRIVATE = 'PRIVATE', // Only admin and assigned users
  ANONYMOUS = 'ANONYMOUS', // Anonymous submissions allowed
}

export enum DeadlineAction {
  DISABLE_FORM = 'DISABLE_FORM', // Form becomes inaccessible
  SHOW_MESSAGE = 'SHOW_MESSAGE', // Show custom message but allow viewing
  REDIRECT = 'REDIRECT', // Redirect to another URL
  ALLOW_LATE_SUBMISSIONS = 'ALLOW_LATE_SUBMISSIONS', // Allow with warning
}

export enum SubmissionBehavior {
  SINGLE = 'SINGLE', // One submission per user
  MULTIPLE = 'MULTIPLE', // Multiple submissions allowed
  DAILY = 'DAILY', // One per day
  WEEKLY = 'WEEKLY', // One per week
  MONTHLY = 'MONTHLY', // One per month
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
}

@Entity({ name: 'form_settings' })
export class FormSettings extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  formId!: string;

  // Privacy & Access Settings
  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.PRIVATE,
  })
  privacyLevel!: PrivacyLevel;

  @Column({ type: 'boolean', default: false })
  requireAuthentication!: boolean;

  @Column({ type: 'boolean', default: false })
  allowAnonymousSubmissions!: boolean;

  @Column({ type: 'text', nullable: true })
  allowedDomains?: string; // JSON array of allowed email domains

  @Column({ type: 'text', nullable: true })
  allowedUsers?: string; // JSON array of user IDs

  @Column({ type: 'text', nullable: true })
  allowedRoles?: string; // JSON array of role names

  // Submission Settings
  @Column({
    type: 'enum',
    enum: SubmissionBehavior,
    default: SubmissionBehavior.SINGLE,
  })
  submissionBehavior!: SubmissionBehavior;

  @Column({ type: 'int', nullable: true })
  maxSubmissions?: number;

  @Column({ type: 'int', nullable: true })
  maxSubmissionsPerUser?: number;

  @Column({ type: 'boolean', default: true })
  allowDraftSave!: boolean;

  @Column({ type: 'boolean', default: false })
  requireAllFields!: boolean;

  // Deadline Settings
  @Column({ type: 'timestamp', nullable: true })
  submissionDeadline?: Date;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({
    type: 'enum',
    enum: DeadlineAction,
    default: DeadlineAction.DISABLE_FORM,
  })
  deadlineAction!: DeadlineAction;

  @Column({ type: 'text', nullable: true })
  deadlineMessage?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  redirectUrl?: string;

  @Column({ type: 'int', default: 0 })
  gracePeriodHours!: number; // Hours after deadline to allow submissions

  // Notification Settings
  @Column({ type: 'text', nullable: true })
  notificationTypes?: string; // JSON array of NotificationType

  @Column({ type: 'boolean', default: true })
  notifyOnSubmission!: boolean;

  @Column({ type: 'boolean', default: false })
  notifyOnDeadlineApproaching!: boolean;

  @Column({ type: 'int', default: 24 })
  deadlineWarningHours!: number; // Hours before deadline to send warning

  @Column({ type: 'text', nullable: true })
  notificationEmails?: string; // JSON array of email addresses

  @Column({ type: 'text', nullable: true })
  webhookUrl?: string;

  // Display Settings
  @Column({ type: 'boolean', default: true })
  showProgressBar!: boolean;

  @Column({ type: 'boolean', default: false })
  showSubmissionCounter!: boolean;

  @Column({ type: 'boolean', default: true })
  showRequiredIndicators!: boolean;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  customCss?: string;

  @Column({ type: 'text', nullable: true })
  customJavaScript?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ type: 'varchar', length: 7, default: '#3B82F6' })
  primaryColor!: string;

  @Column({ type: 'varchar', length: 7, default: '#1F2937' })
  secondaryColor!: string;

  // Security Settings
  @Column({ type: 'boolean', default: false })
  enableCaptcha!: boolean;

  @Column({ type: 'boolean', default: false })
  enableRateLimiting!: boolean;

  @Column({ type: 'int', default: 10 })
  maxSubmissionsPerMinute!: number;

  @Column({ type: 'boolean', default: false })
  logIpAddresses!: boolean;

  @Column({ type: 'boolean', default: false })
  enableEncryption!: boolean;

  // Auto-response Settings
  @Column({ type: 'boolean', default: false })
  sendConfirmationEmail!: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  confirmationEmailSubject?: string;

  @Column({ type: 'text', nullable: true })
  confirmationEmailTemplate?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thankYouPageUrl?: string;

  @Column({ type: 'text', nullable: true })
  thankYouMessage?: string;

  // Advanced Settings
  @Column({ type: 'boolean', default: false })
  enableConditionalLogic!: boolean;

  @Column({ type: 'text', nullable: true })
  conditionalRules?: string; // JSON object with conditional logic rules

  @Column({ type: 'boolean', default: false })
  enableFieldValidation!: boolean;

  @Column({ type: 'text', nullable: true })
  validationRules?: string; // JSON object with validation rules

  @Column({ type: 'int', nullable: true })
  autoSaveInterval?: number; // Minutes between auto-saves

  @Column({ type: 'boolean', default: false })
  enableAuditLog!: boolean;

  @Column({ type: 'text', nullable: true })
  customMetadata?: string; // JSON object for additional custom settings

  /* Relations -------------------------------------------------------------- */

  @OneToOne(() => Form, form => form.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formId' })
  form!: Form;

  /* Timestamps -------------------------------------------------------------- */

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /* Helper Methods --------------------------------------------------------- */

  /**
   * Parse JSON fields
   */
  getAllowedDomains(): string[] {
    return this.allowedDomains ? JSON.parse(this.allowedDomains) : [];
  }

  getAllowedUsers(): string[] {
    return this.allowedUsers ? JSON.parse(this.allowedUsers) : [];
  }

  getAllowedRoles(): string[] {
    return this.allowedRoles ? JSON.parse(this.allowedRoles) : [];
  }

  getNotificationTypes(): NotificationType[] {
    return this.notificationTypes ? JSON.parse(this.notificationTypes) : [NotificationType.EMAIL];
  }

  getNotificationEmails(): string[] {
    return this.notificationEmails ? JSON.parse(this.notificationEmails) : [];
  }

  getConditionalRules(): any {
    return this.conditionalRules ? JSON.parse(this.conditionalRules) : {};
  }

  getValidationRules(): any {
    return this.validationRules ? JSON.parse(this.validationRules) : {};
  }

  getCustomMetadata(): any {
    return this.customMetadata ? JSON.parse(this.customMetadata) : {};
  }

  /**
   * Set JSON fields
   */
  setAllowedDomains(domains: string[]): void {
    this.allowedDomains = JSON.stringify(domains);
  }

  setAllowedUsers(users: string[]): void {
    this.allowedUsers = JSON.stringify(users);
  }

  setAllowedRoles(roles: string[]): void {
    this.allowedRoles = JSON.stringify(roles);
  }

  setNotificationTypes(types: NotificationType[]): void {
    this.notificationTypes = JSON.stringify(types);
  }

  setNotificationEmails(emails: string[]): void {
    this.notificationEmails = JSON.stringify(emails);
  }

  setConditionalRules(rules: any): void {
    this.conditionalRules = JSON.stringify(rules);
  }

  setValidationRules(rules: any): void {
    this.validationRules = JSON.stringify(rules);
  }

  setCustomMetadata(metadata: any): void {
    this.customMetadata = JSON.stringify(metadata);
  }

  /**
   * Check if form is currently accepting submissions
   */
  isAcceptingSubmissions(): boolean {
    const now = new Date();

    // Check if form has started
    if (this.startDate && now < this.startDate) {
      return false;
    }

    // Check if deadline has passed
    if (this.submissionDeadline && now > this.submissionDeadline) {
      // Check if grace period is allowed
      if (this.gracePeriodHours > 0) {
        const gracePeriodEnd = new Date(this.submissionDeadline);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + this.gracePeriodHours);
        return now <= gracePeriodEnd;
      }
      return this.deadlineAction === DeadlineAction.ALLOW_LATE_SUBMISSIONS;
    }

    return true;
  }

  /**
   * Check if deadline warning should be sent
   */
  shouldSendDeadlineWarning(): boolean {
    if (!this.notifyOnDeadlineApproaching || !this.submissionDeadline) {
      return false;
    }

    const now = new Date();
    const warningTime = new Date(this.submissionDeadline);
    warningTime.setHours(warningTime.getHours() - this.deadlineWarningHours);

    return now >= warningTime && now < this.submissionDeadline;
  }

  /**
   * Get default settings for a new form
   */
  static getDefaultSettings(): Partial<FormSettings> {
    return {
      privacyLevel: PrivacyLevel.PRIVATE,
      requireAuthentication: false,
      allowAnonymousSubmissions: false,
      submissionBehavior: SubmissionBehavior.SINGLE,
      allowDraftSave: true,
      requireAllFields: false,
      deadlineAction: DeadlineAction.DISABLE_FORM,
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
    };
  }
}
