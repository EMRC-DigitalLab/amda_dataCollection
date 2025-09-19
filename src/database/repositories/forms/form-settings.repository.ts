// @ts-nocheck
import { Repository, SelectQueryBuilder } from 'typeorm';

import { AppDataSource } from '../../../config';
import {
  ICreateFormSettings,
  IFormSettingsQuery,
  IUpdateFormSettings,
} from '../../../modules/forms/interfaces/form-settings.interface';
import { FormSettings } from '../../entities/form-settings.entity';

export class FormSettingsRepository {
  private repository: Repository<FormSettings>;

  constructor(dataSource: DataSource) {
    this.repository = AppDataSource.getRepository(FormSettings);
  }

  /**
   * Create new form settings
   */
  async create(data: ICreateFormSettings): Promise<FormSettings> {
    const formSettings = this.repository.create(data);

    // Convert array fields to JSON strings
    if (data.allowedDomains) {
      formSettings.setAllowedDomains(data.allowedDomains);
    }
    if (data.allowedUsers) {
      formSettings.setAllowedUsers(data.allowedUsers);
    }
    if (data.allowedRoles) {
      formSettings.setAllowedRoles(data.allowedRoles);
    }
    if (data.notificationTypes) {
      formSettings.setNotificationTypes(data.notificationTypes);
    }
    if (data.notificationEmails) {
      formSettings.setNotificationEmails(data.notificationEmails);
    }
    if (data.conditionalRules) {
      formSettings.setConditionalRules(data.conditionalRules);
    }
    if (data.validationRules) {
      formSettings.setValidationRules(data.validationRules);
    }
    if (data.customMetadata) {
      formSettings.setCustomMetadata(data.customMetadata);
    }

    return await this.repository.save(formSettings);
  }

  /**
   * Create form settings with default values
   */
  async createWithDefaults(formId: string): Promise<FormSettings> {
    const defaultSettings = FormSettings.getDefaultSettings();
    const formSettings = this.repository.create({
      formId,
      ...defaultSettings,
    });

    return await this.repository.save(formSettings);
  }

  /**
   * Find form settings by ID
   */
  async findById(id: string): Promise<FormSettings | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['form'],
    });
  }

  /**
   * Find form settings by form ID
   */
  async findByFormId(formId: string): Promise<FormSettings | null> {
    return await this.repository.findOne({
      where: { formId },
      relations: ['form'],
    });
  }

  /**
   * Update form settings
   */
  async update(id: string, data: IUpdateFormSettings): Promise<FormSettings | null> {
    const formSettings = await this.findById(id);
    if (!formSettings) {
      return null;
    }

    // Handle array fields
    if (data.allowedDomains !== undefined) {
      formSettings.setAllowedDomains(data.allowedDomains);
      delete data.allowedDomains;
    }
    if (data.allowedUsers !== undefined) {
      formSettings.setAllowedUsers(data.allowedUsers);
      delete data.allowedUsers;
    }
    if (data.allowedRoles !== undefined) {
      formSettings.setAllowedRoles(data.allowedRoles);
      delete data.allowedRoles;
    }
    if (data.notificationTypes !== undefined) {
      formSettings.setNotificationTypes(data.notificationTypes);
      delete data.notificationTypes;
    }
    if (data.notificationEmails !== undefined) {
      formSettings.setNotificationEmails(data.notificationEmails);
      delete data.notificationEmails;
    }
    if (data.conditionalRules !== undefined) {
      formSettings.setConditionalRules(data.conditionalRules);
      delete data.conditionalRules;
    }
    if (data.validationRules !== undefined) {
      formSettings.setValidationRules(data.validationRules);
      delete data.validationRules;
    }
    if (data.customMetadata !== undefined) {
      formSettings.setCustomMetadata(data.customMetadata);
      delete data.customMetadata;
    }

    // Update other fields
    Object.assign(formSettings, data);

    return await this.repository.save(formSettings);
  }

  /**
   * Update form settings by form ID
   */
  async updateByFormId(formId: string, data: IUpdateFormSettings): Promise<FormSettings | null> {
    const formSettings = await this.findByFormId(formId);
    if (!formSettings) {
      return null;
    }

    return await this.update(formSettings.id, data);
  }

  /**
   * Delete form settings
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Delete form settings by form ID
   */
  async deleteByFormId(formId: string): Promise<boolean> {
    const result = await this.repository.delete({ formId });
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Find all form settings with filtering and pagination
   */
  async findAll(query: IFormSettingsQuery): Promise<{
    settings: FormSettings[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      formId,
      privacyLevel,
      submissionBehavior,
      deadlineAction,
      enableCaptcha,
      enableRateLimiting,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.repository
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.form', 'form');

    // Apply filters
    this.applyFilters(queryBuilder, {
      formId,
      privacyLevel,
      submissionBehavior,
      deadlineAction,
      enableCaptcha,
      enableRateLimiting,
    });

    // Apply sorting
    queryBuilder.orderBy(`fs.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [settings, total] = await queryBuilder.getManyAndCount();

    return {
      settings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find form settings that need deadline warnings
   */
  async findSettingsNeedingDeadlineWarnings(): Promise<FormSettings[]> {
    const now = new Date();

    return await this.repository
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.form', 'form')
      .where('fs.notifyOnDeadlineApproaching = :notify', { notify: true })
      .andWhere('fs.submissionDeadline IS NOT NULL')
      .andWhere('fs.submissionDeadline > :now', { now })
      .andWhere(
        `
        fs.submissionDeadline <= :warningTime
      `,
        {
          warningTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
        }
      )
      .getMany();
  }

  /**
   * Find expired form settings
   */
  async findExpiredSettings(): Promise<FormSettings[]> {
    const now = new Date();

    return await this.repository
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.form', 'form')
      .where('fs.submissionDeadline IS NOT NULL')
      .andWhere('fs.submissionDeadline < :now', { now })
      .getMany();
  }

  /**
   * Count form settings by privacy level
   */
  async countByPrivacyLevel(): Promise<Record<string, number>> {
    const results = await this.repository
      .createQueryBuilder('fs')
      .select('fs.privacyLevel', 'privacyLevel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('fs.privacyLevel')
      .getRawMany();

    return results.reduce(
      (acc, result) => {
        acc[result.privacyLevel] = parseInt(result.count);
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Get form settings statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byPrivacyLevel: Record<string, number>;
    bySubmissionBehavior: Record<string, number>;
    withDeadlines: number;
    withNotifications: number;
    withCaptcha: number;
  }> {
    const [total, privacyStats, behaviorStats, deadlineCount, notificationCount, captchaCount] =
      await Promise.all([
        this.repository.count(),
        this.countByPrivacyLevel(),
        this.countBySubmissionBehavior(),
        this.repository.count({ where: { submissionDeadline: { $ne: null } } } as any),
        this.repository.count({ where: { notifyOnSubmission: true } }),
        this.repository.count({ where: { enableCaptcha: true } }),
      ]);

    return {
      total,
      byPrivacyLevel: privacyStats,
      bySubmissionBehavior: behaviorStats,
      withDeadlines: deadlineCount,
      withNotifications: notificationCount,
      withCaptcha: captchaCount,
    };
  }

  /**
   * Count by submission behavior
   */
  private async countBySubmissionBehavior(): Promise<Record<string, number>> {
    const results = await this.repository
      .createQueryBuilder('fs')
      .select('fs.submissionBehavior', 'submissionBehavior')
      .addSelect('COUNT(*)', 'count')
      .groupBy('fs.submissionBehavior')
      .getRawMany();

    return results.reduce(
      (acc, result) => {
        acc[result.submissionBehavior] = parseInt(result.count);
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<FormSettings>,
    filters: Partial<IFormSettingsQuery>
  ): void {
    const {
      formId,
      privacyLevel,
      submissionBehavior,
      deadlineAction,
      enableCaptcha,
      enableRateLimiting,
    } = filters;

    if (formId) {
      queryBuilder.andWhere('fs.formId = :formId', { formId });
    }

    if (privacyLevel) {
      queryBuilder.andWhere('fs.privacyLevel = :privacyLevel', { privacyLevel });
    }

    if (submissionBehavior) {
      queryBuilder.andWhere('fs.submissionBehavior = :submissionBehavior', { submissionBehavior });
    }

    if (deadlineAction) {
      queryBuilder.andWhere('fs.deadlineAction = :deadlineAction', { deadlineAction });
    }

    if (enableCaptcha !== undefined) {
      queryBuilder.andWhere('fs.enableCaptcha = :enableCaptcha', { enableCaptcha });
    }

    if (enableRateLimiting !== undefined) {
      queryBuilder.andWhere('fs.enableRateLimiting = :enableRateLimiting', { enableRateLimiting });
    }
  }

  /**
   * Bulk update form settings
   */
  async bulkUpdate(ids: string[], data: IUpdateFormSettings): Promise<number> {
    const result = await this.repository.update(ids, data);
    return result.affected || 0;
  }

  /**
   * Check if form settings exist for form
   */
  async existsByFormId(formId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { formId } });
    return count > 0;
  }

  /**
   * Get form settings with form details
   */
  async findWithFormDetails(id: string): Promise<FormSettings | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['form', 'form.admin', 'form.categories'],
    });
  }

  /**
   * Find all settings for forms owned by a specific admin
   */
  async findByAdminId(adminId: string): Promise<FormSettings[]> {
    return await this.repository
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.form', 'form')
      .where('form.adminId = :adminId', { adminId })
      .getMany();
  }
}
