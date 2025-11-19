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

      if (existingSubmission) {
        logger.debug(`Submission already exists for site: ${site.name}, updating...`);

        // Update existing submission
        const updatedSubmission = await this.formRepository.updateSubmission(
          form.id,
          existingSubmission.id,
          {
            ...siteRow.data,
            minigrid_siteId: site.id,
          }
        );

        logger.debug(`Submission updated for site: ${site.name}`);
        return updatedSubmission;
      }

      // Create new submission
      logger.debug(`Creating new submission for site: ${site.name}`);

      const submission = await this.formRepository.submitFormData(
        form.id,
        {
          ...siteRow.data,
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
   * Batch process submissions for multiple sites
   */
  async batchProcessSubmissions(
    form: Form,
    sites: MinigridSite[],
    member: Member,
    siteRows: SiteDataRow[]
  ): Promise<{
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ site: string; error: string }>;
  }> {
    logger.info(`Batch processing ${siteRows.length} submissions...`);

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ site: string; error: string }>,
    };

    for (let i = 0; i < siteRows.length; i++) {
      const siteRow = siteRows[i];
      const site = sites[i];

      try {
        const existingSubmission = await this.formRepository.getSubmissionByMinigridSiteId(
          form.id,
          site.id
        );

        if (existingSubmission) {
          await this.formRepository.updateSubmission(form.id, existingSubmission.id, {
            ...siteRow.data,
            minigrid_siteId: site.id,
          });
          results.updated++;
        } else {
          await this.formRepository.submitFormData(
            form.id,
            {
              ...siteRow.data,
              minigrid_siteId: site.id,
            },
            member.id
          );
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          site: site.name,
          error: error.message,
        });
        logger.warn(`Failed to process submission for site: ${site.name}`, {
          error: error.message,
        });
      }
    }

    logger.info('Batch processing complete', {
      created: results.created,
      updated: results.updated,
      failed: results.failed,
    });

    return results;
  }
}
