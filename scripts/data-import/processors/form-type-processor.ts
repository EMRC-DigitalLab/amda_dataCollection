// processors/form-type-processor.ts - Create or retrieve Form Types

import { DataSource } from 'typeorm';
import { FormType, FormTypeStatus } from '../../../src/database/entities/form-type.entity';
import { FormTypeRepository } from '../../../src/database/repositories/forms/form-type.repository';
import { InstructionsData } from '../types';
import { logger } from '../utils/logger';

export class FormTypeProcessor {
  private formTypeRepository: FormTypeRepository;

  constructor(dataSource: DataSource) {
    this.formTypeRepository = new FormTypeRepository(dataSource);
  }

  /**
   * Process form types from instructions
   * Returns map of form type name to FormType entity
   */
  async processFormTypes(
    instructions: InstructionsData,
    year: number
  ): Promise<Map<string, FormType>> {
    logger.section('STEP 3: PROCESSING FORM TYPES');
    logger.info(`Processing ${instructions.sections.length} form types for year ${year}`);

    const formTypeMap = new Map<string, FormType>();

    try {
      for (const section of instructions.sections) {
        const formType = await this.processFormType(
          section.title,
          section.description,
          section.slug,
          year
        );
        formTypeMap.set(section.title, formType);
      }

      logger.success(`Form types processing complete: ${formTypeMap.size} types ready`);
      logger.separator();

      return formTypeMap;
    } catch (error: any) {
      logger.error('Failed to process form types', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Process individual form type
   */
  private async processFormType(
    name: string,
    description: string,
    slug: string,
    year: number
  ): Promise<FormType> {
    logger.debug(`Processing form type: ${name} (${year})`);

    try {
      // Check if form type exists for this year
      let formType = await this.formTypeRepository.findByNameAndYear(name, year);

      if (formType) {
        logger.info(`Form type already exists: ${name} (${year}) - ID: ${formType.id}`);
        return formType;
      }

      // Check if slug exists (to avoid conflicts)
      const existingSlug = await this.formTypeRepository.findBySlug(slug);
      if (existingSlug) {
        if (existingSlug.year === year) {
          logger.info(`Form type already exists with this slug for year ${year}, using existing`);
          return existingSlug;
        }
        slug = `${slug}-${year}`;
        logger.warn(`Slug conflict detected, using: ${slug}`);
      }

      // Create new form type
      logger.info(`Creating new form type: ${name} (${year})`);

      formType = await this.formTypeRepository.create({
        name,
        slug,
        description,
        year,
        status: FormTypeStatus.ACTIVE,
        isPublic: true,
        isDefault: false,
        sortOrder: 0,
      });

      logger.success(`Form type created: ${name} - ID: ${formType.id}`);

      return formType;
    } catch (error: any) {
      logger.error(`Failed to process form type: ${name}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
