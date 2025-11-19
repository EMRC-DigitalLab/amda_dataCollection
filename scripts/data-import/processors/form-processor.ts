// processors/form-processor.ts - Create and publish forms

import { DataSource } from 'typeorm';
import { Form, FormStatus } from '../../../src/database/entities/form.entity';
import { FormType } from '../../../src/database/entities/form-type.entity';
import { FormRepository } from '../../../src/database/repositories/forms/form.repository';
import { DataSheet } from '../types';
import { generateSlug } from '../utils/slug-generator';
import { logger } from '../utils/logger';

export class FormProcessor {
  private formRepository: FormRepository;
  private adminId: string; // System admin ID for form creation

  constructor(dataSource: DataSource, adminId: string) {
    this.formRepository = new FormRepository(dataSource);
    this.adminId = adminId;
  }

  /**
   * Process form - create if doesn't exist, then publish
   */
  async processForm(dataSheet: DataSheet, formType: FormType): Promise<Form> {
    logger.section(`STEP 4: PROCESSING FORM - ${dataSheet.sheetName}`);
    logger.info(`Processing form: ${dataSheet.sheetName}`);

    try {
      const slug = generateSlug(dataSheet.sheetName);

      // Check if form exists
      let form = await this.formRepository.findFormBySlug(slug);

      if (form && form.formTypeId === formType.id) {
        logger.info(`Form already exists: ${form.title} (ID: ${form.id})`);

        // Ensure form is published
        if (form.status !== FormStatus.PUBLISHED) {
          logger.info('Publishing existing form...');
          form = await this.publishForm(form);
        }

        return form;
      }

      // Create new form
      logger.info('Creating new form with categories and questions...');

      const formData = {
        title: dataSheet.sheetName,
        slug,
        description: `${dataSheet.sheetName} data collection form`,
        formTypeId: formType.id,
        status: FormStatus.DRAFT,
        adminId: this.adminId,
        categories: dataSheet.categories.map(cat => ({
          name: cat.name,
          slug: cat.slug,
          sortOrder: cat.sortOrder,
          questions: cat.questions.map(q => ({
            kpi: q.kpi,
            slug: q.slug,
            description: q.description,
            type: q.type,
            required: q.required,
            sortOrder: q.sortOrder,
            options: q.options,
          })),
        })),
      };

      form = await this.formRepository.createForm(formData);

      logger.success(`Form created: ${form.title} (ID: ${form.id})`);
      logger.info(`- ${dataSheet.categories.length} categories`);
      logger.info(
        `- ${dataSheet.categories.reduce((sum, cat) => sum + cat.questions.length, 0)} questions`
      );

      // Publish form
      form = await this.publishForm(form);

      logger.separator();

      return form;
    } catch (error: any) {
      logger.error(`Failed to process form: ${dataSheet.sheetName}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Publish form (creates dynamic submission table)
   */
  private async publishForm(form: Form): Promise<Form> {
    if (form.status === FormStatus.PUBLISHED) {
      logger.debug(`Form already published: ${form.title}`);
      return form;
    }

    logger.info(`Publishing form: ${form.title}`);

    try {
      const publishedForm = await this.formRepository.publishForm(form.id);
      logger.success(`Form published successfully: ${publishedForm.title}`);
      logger.info(`Dynamic table created: ${publishedForm.tableName}`);

      return publishedForm;
    } catch (error: any) {
      logger.error(`Failed to publish form: ${form.title}`, {
        formId: form.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
