// processors/submission-processor.ts - Submit form data for sites

import { DataSource } from 'typeorm';
import { Form } from '../../../src/database/entities/form.entity';
import { MinigridSite } from '../../../src/database/entities/minigrid-site.entity';
import { Member } from '../../../src/database/entities/member.entity';
import { FormRepository } from '../../../src/database/repositories/forms/form.repository';
import { SiteDataRow } from '../types';
import { logger } from '../utils/logger';

export class SubmissionProcessor {
  private formRepository: FormRepository;

  constructor(dataSource: DataSource) {
    this.formRepository = new FormRepository(dataSource);
  }

  /**
   * Process submission - create or update form submission for site
   */
  async processSubmission(
    form: Form,
    site: MinigridSite,
    member: Member,
    siteRow: SiteDataRow
  ): Promise<any> {
    logger.debug(`Processing submission for site: ${site.name}`);

    try {
      // Check if submission already exists
      const existingSubmission = await this.formRepository.getSubmissionByMinigridSiteId(
        form.id,
        site.id
      );

      // Clean and validate data
      const cleanedData = this.cleanSubmissionData(siteRow.data, form);

      // Validate before submission
      const validation = this.validateSubmissionData(cleanedData, form, site);
      if (!validation.isValid) {
        logger.warn(`Validation warnings for site: ${site.name}`, validation.warnings);
      }

      // Log what we're about to send
      logger.debug(`Submission data for ${site.name}:`, {
        siteId: site.id,
        formId: form.id,
        dataKeys: Object.keys(cleanedData),
        sampleData: this.getSampleData(cleanedData),
      });

      if (existingSubmission) {
        logger.debug(`Submission already exists for site: ${site.name}, updating...`);
        const updatedSubmission = await this.formRepository.updateSubmission(
          form.id,
          existingSubmission.id,
          {
            ...cleanedData,
            minigrid_siteId: site.id,
          }
        );
        logger.success(`Submission updated for site: ${site.name}`);
        return updatedSubmission;
      }

      logger.debug(`Creating new submission for site: ${site.name}`);
      const submission = await this.formRepository.submitFormData(
        form.id,
        {
          ...cleanedData,
          minigrid_siteId: site.id,
        },
        member.id
      );

      logger.success(`Submission created for site: ${site.name} (ID: ${submission.id})`);
      return submission;
    } catch (error: any) {
      logger.error(`Failed to process submission for site: ${site.name}`, {
        formId: form.id,
        siteId: site.id,
        siteName: site.name,
        rowIndex: siteRow.rowIndex,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Clean submission data - remove invalid characters, format correctly
   */
  private cleanSubmissionData(data: Record<string, any>, form: Form): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined || value === '') {
        cleaned[key] = null;
        continue;
      }

      // Find question type
      let questionType = 'text';
      for (const cat of form.categories) {
        for (const q of cat.questions) {
          if (q.slug === key) {
            questionType = q.type;
            break;
          }
        }
      }

      // Clean based on type
      if (questionType === 'number' || questionType === 'currency') {
        // Remove commas, letters, spaces, etc - keep only numbers, dots, and minus
        const cleanedValue = String(value).replace(/[^0-9.-]/g, '');
        cleaned[key] = cleanedValue || null;
      } else if (questionType === 'date') {
        // Handle date formats
        cleaned[key] = this.cleanDateValue(value);
      } else if (questionType === 'boolean') {
        // Convert to boolean
        const strValue = String(value).toLowerCase();
        cleaned[key] = strValue === 'yes' || strValue === 'true' || strValue === '1';
      } else {
        // Keep as-is for text, textarea, select, etc
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Clean date value
   */
  private cleanDateValue(value: any): string | null {
    if (!value) return null;

    // If already a Date object
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    // If string, try to parse
    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Try to parse other formats
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Invalid date
    }

    return null;
  }

  /**
   * Validate submission data before sending to database
   */
  private validateSubmissionData(
    data: Record<string, any>,
    form: Form,
    _site: MinigridSite
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    for (const category of form.categories) {
      for (const question of category.questions) {
        const value = data[question.slug];

        // Check required fields
        if (question.required && (value === null || value === undefined || value === '')) {
          warnings.push(`Missing required field: ${question.kpi}`);
        }

        // Type validation
        if (value !== null && value !== undefined && value !== '') {
          switch (question.type) {
            case 'number':
            case 'currency':
              if (isNaN(Number(value))) {
                warnings.push(`Invalid number for ${question.kpi}: ${value}`);
              }
              break;
            case 'email':
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
                warnings.push(`Invalid email for ${question.kpi}: ${value}`);
              }
              break;
            case 'boolean':
              if (typeof value !== 'boolean') {
                warnings.push(`Invalid boolean for ${question.kpi}: ${value}`);
              }
              break;
          }
        }
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Get sample of data for logging (first 3 fields)
   */
  private getSampleData(data: Record<string, any>): Record<string, any> {
    const sample: Record<string, any> = {};
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (count >= 3) break;
      sample[key] = value;
      count++;
    }
    return sample;
  }
}
