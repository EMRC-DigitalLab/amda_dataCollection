import { DataSource } from 'typeorm';
import { FormType, FormTypeStatus } from '../../../database/entities/form-type.entity';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import {
  FormTypeCreateData,
  FormTypeQuery,
  FormTypeStatistics,
  FormTypeUpdateData,
} from '../interfaces/form-type.interface';
import { FormTypeRepository } from './../../../database/repositories/forms/form-type.repository';

export class FormTypeService {
  private formTypeRepository: FormTypeRepository;
  private formRepository: FormRepository;

  constructor(private readonly dataSource: DataSource) {
    this.formTypeRepository = new FormTypeRepository(dataSource);
    this.formRepository = new FormRepository(dataSource);
  }

  async create(data: FormTypeCreateData): Promise<FormType> {
    // Check for duplicate name/year combination
    const existing = await this.formTypeRepository.findByNameAndYear(data.name, data.year);

    if (existing) {
      throw new Error(`Form type with name "${data.name}" already exists for year ${data.year}`);
    }

    // Check for duplicate slug
    const existingSlug = await this.formTypeRepository.findBySlug(data.slug!);

    if (existingSlug) {
      // Append year to make slug unique
      data.slug = `${data.slug}-${data.year}`;
    }

    return await this.formTypeRepository.save(data!);
  }

  async findAll(query: FormTypeQuery = {}): Promise<{
    formTypes: FormType[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = query;

    const [formTypes, total] = await this.formTypeRepository.findAllWithFilters(query);

    return {
      formTypes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<FormType | null> {
    return this.formTypeRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<FormType | null> {
    return this.formTypeRepository.findBySlug(slug);
  }

  async update(id: string, data: FormTypeUpdateData): Promise<FormType> {
    const formType = await this.findById(id);
    if (!formType) {
      throw new Error(`Form type with ID ${id} not found`);
    }

    // Check for duplicate name/year if name or year is being updated
    if (data.name || data.year) {
      const name = data.name || formType.name;
      const year = data.year || formType.year;

      const existing = await this.formTypeRepository.findByNameAndYearExcludingId(name, year, id);

      if (existing) {
        throw new Error(`Form type with name "${name}" already exists for year ${year}`);
      }
    }

    // Update slug if name changed
    if (data.name && data.name !== formType.name) {
      const newSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      data.slug = newSlug;
    }

    return this.formTypeRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const formType = await this.formTypeRepository.findById(id);

    if (!formType) {
      throw new Error(`Form type with ID ${id} not found`);
    }

    // Check if form type is being used by any forms
    if (formType.forms && formType.forms.length > 0) {
      throw new Error(
        `Cannot delete form type "${formType.name}" as it is being used by ${formType.forms.length} form(s)`
      );
    }

    await this.formTypeRepository.delete(formType);
  }

  async forceDelete(id: string): Promise<{ deletedForms: number; deletedSubmissions: number; formTypeDeleted: boolean }> {
    const formType = await this.formTypeRepository.findById(id);

    if (!formType) {
      throw new Error(`Form type with ID ${id} not found`);
    }

    let deletedForms = 0;
    let totalDeletedSubmissions = 0;

    // If form type has forms, delete all of them with their submissions
    if (formType.forms && formType.forms.length > 0) {
      for (const form of formType.forms) {
        try {
          // Get the form to check if it has a submission table
          const fullForm = await this.formRepository.findFormById(form.id);
          let submissionCount = 0;

          // If form has a submission table, count and delete submissions first
          if (fullForm?.tableCreated && fullForm?.tableName) {
            try {
              submissionCount = await this.getSubmissionCount(fullForm.tableName);
              if (submissionCount > 0) {
                await this.formRepository.deleteAllSubmissions(fullForm.tableName);
                totalDeletedSubmissions += submissionCount;
              }
            } catch (error:any) {
              console.warn(`Warning: Could not delete submissions for form ${form.id}: ${error.message}`);
            }
          }

          // Delete the form itself (this will drop the table too)
          await this.formRepository.deleteForm(form.id);
          deletedForms++;
        } catch (error:any) {
          console.warn(`Warning: Could not delete form ${form.id}: ${error.message}`);
          // Continue with other forms even if one fails
        }
      }
    }

    // Delete the form type itself
    await this.formTypeRepository.delete(formType);

    return {
      deletedForms,
      deletedSubmissions: totalDeletedSubmissions,
      formTypeDeleted: true
    };
  }

  private async getSubmissionCount(tableName: string): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      return parseInt(result[0].count, 10) || 0;
    } catch (error) {
      return 0; // Table might not exist
    } finally {
      await queryRunner.release();
    }
  }

  async getActiveFormTypes(year?: number): Promise<FormType[]> {
    return this.formTypeRepository.findActiveAndPublic(year);
  }

  async bulkUpdateSortOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    await this.formTypeRepository.bulkUpdateSortOrder(updates);
  }

  async seedDefaultFormTypes(): Promise<FormType[]> {
    const currentYear = new Date().getFullYear();
    const defaultTypes = [
      {
        name: 'Finance',
        description: 'Financial reports and budget forms',
        icon: 'dollar-sign',
        color: '#10B981',
      },
      {
        name: 'Project',
        description: 'Project management and tracking forms',
        icon: 'folder',
        color: '#3B82F6',
      },
      {
        name: 'Assessment',
        description: 'Evaluation and assessment forms',
        icon: 'clipboard-list',
        color: '#F59E0B',
      },
      {
        name: 'Survey',
        description: 'Survey and feedback collection forms',
        icon: 'chart-bar',
        color: '#8B5CF6',
      },
      {
        name: 'HR',
        description: 'Human resources and personnel forms',
        icon: 'users',
        color: '#EF4444',
      },
      {
        name: 'Custom',
        description: 'Custom and miscellaneous forms',
        icon: 'cog',
        color: '#6B7280',
      },
    ];

    const createdTypes: FormType[] = [];

    for (const [index, typeData] of defaultTypes.entries()) {
      const existing = await this.formTypeRepository.findByNameAndYear(typeData.name, currentYear);

      if (!existing) {
        const formTypeData = {
          ...typeData,
          year: currentYear,
          sortOrder: index,
          isDefault: true,
          isPublic: true,
          status: FormTypeStatus.ACTIVE,
        };

        const formType = await this.formTypeRepository.create(formTypeData);
        if (!formType.slug) {
          formType.generateSlug();
        }
        createdTypes.push(await this.formTypeRepository.save(formType));
      }
    }

    return createdTypes;
  }

  // Add the missing methods that your controller is calling
  async getStatistics(): Promise<FormTypeStatistics> {
    return this.formTypeRepository.getStatistics();
  }

  async getDefaultTypes(year: number): Promise<FormType[]> {
    return this.formTypeRepository.findDefaultTypes(year);
  }

  // Additional utility methods
  async getFormTypeOptions(
    year?: number,
    activeOnly = true
  ): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      color?: string;
      icon?: string;
    }>
  > {
    return this.formTypeRepository.getFormTypeOptions(year, activeOnly);
  }

  async searchFormTypes(searchTerm: string, limit?: number): Promise<FormType[]> {
    return this.formTypeRepository.searchFormTypes(searchTerm, limit);
  }

  async archiveOldFormTypes(beforeYear: number): Promise<number> {
    return this.formTypeRepository.archiveOldFormTypes(beforeYear);
  }

  async findUnusedFormTypes(): Promise<FormType[]> {
    return this.formTypeRepository.findUnusedFormTypes();
  }

  async reorderFormTypes(orderedIds: string[]): Promise<void> {
    await this.formTypeRepository.reorderFormTypes(orderedIds);
  }

  /**
   * Clone/Replicate a form type with all its forms to a new year
   */
  async replicateFormType(
    sourceFormTypeId: string,
    targetYear: number,
    options?: {
      prefix?: string;
      includeDrafts?: boolean;
      preservePublishedStatus?: boolean;
    }
  ): Promise<FormType> {
    // Validate source form type exists
    const sourceFormType = await this.findById(sourceFormTypeId);
    if (!sourceFormType) {
      throw new Error(`Source form type with ID ${sourceFormTypeId} not found`);
    }

    // Validate target year
    const currentYear = new Date().getFullYear();
    if (targetYear < currentYear - 10 || targetYear > currentYear + 10) {
      throw new Error(
        `Invalid target year ${targetYear}. Must be within 10 years of current year.`
      );
    }

    // Validate target year is different
    if (targetYear === sourceFormType.year) {
      throw new Error(
        `Target year ${targetYear} is the same as the source year. Please choose a different year.`
      );
    }

    // Check if target year already has this form type
    const existingFormType = await this.formTypeRepository.findByNameAndYear(
      sourceFormType.name,
      targetYear
    );

    if (existingFormType) {
      throw new Error(
        `Form type "${sourceFormType.name}" already exists for year ${targetYear}. ` +
          `Please delete the existing form type first or choose a different year.`
      );
    }

    // Generate expected slug and check if it exists
    const baseSlug = sourceFormType.slug.replace(/-\d{4}$/, '');
    const expectedSlug = `${baseSlug}-${targetYear}`;
    const existingSlug = await this.formTypeRepository.findBySlug(expectedSlug);

    if (existingSlug) {
      throw new Error(
        `A form type with slug "${expectedSlug}" already exists. ` +
          `This may indicate a naming conflict. Please resolve this before replicating.`
      );
    }

    console.log(
      `Starting replication process for form type: ${sourceFormType.name} (${sourceFormType.year}) → ${targetYear}`
    );

    try {
      const result = await this.formTypeRepository.cloneFormTypeWithForms(
        sourceFormTypeId,
        targetYear,
        options
      );

      console.log(`Replication completed successfully. New form type ID: ${result.id}`);

      return result;
    } catch (error) {
      console.error(`Replication failed:`, error);
      throw error;
    }
  }

  /**
   * Replicate a form type to multiple years at once
   */
  async replicateFormTypeToMultipleYears(
    sourceFormTypeId: string,
    targetYears: number[],
    options?: {
      prefix?: string;
      includeDrafts?: boolean;
      preservePublishedStatus?: boolean;
    }
  ): Promise<{
    successful: FormType[];
    failed: Array<{ year: number; error: string }>;
  }> {
    // Validate source form type exists
    const sourceFormType = await this.findById(sourceFormTypeId);
    if (!sourceFormType) {
      throw new Error(`Source form type with ID ${sourceFormTypeId} not found`);
    }

    // Validate years
    const currentYear = new Date().getFullYear();
    const validYears = targetYears.filter(
      year => year >= currentYear - 10 && year <= currentYear + 10
    );

    if (validYears.length === 0) {
      throw new Error('No valid target years provided');
    }

    const successful: FormType[] = [];
    const failed: Array<{ year: number; error: string }> = [];

    for (const year of validYears) {
      try {
        const replicatedFormType = await this.replicateFormType(sourceFormTypeId, year, options);
        successful.push(replicatedFormType);
      } catch (error: any) {
        failed.push({
          year,
          error: error.message,
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get replication preview - shows what would be replicated
   */
  async getReplicationPreview(sourceFormTypeId: string): Promise<{
    formType: {
      id: string;
      name: string;
      year: number;
      description: string;
    };
    formsCount: number;
    publishedFormsCount: number;
    draftFormsCount: number;
    totalQuestionsCount: number;
    forms: Array<{
      id: string;
      title: string;
      status: string;
      categoriesCount: number;
      questionsCount: number;
    }>;
  }> {
    const formType = await this.formTypeRepository.findById(sourceFormTypeId);
    console.log(formType, 'this is formtypeid');

    if (!formType) {
      throw new Error(`Form type with ID ${sourceFormTypeId} not found`);
    }

    const forms = formType.forms || [];
    const publishedForms = forms.filter(f => f.status === 'PUBLISHED');
    const draftForms = forms.filter(f => f.status === 'DRAFT');

    const formsDetails = forms.map(form => ({
      id: form.id,
      title: form.title,
      status: form.status,
      categoriesCount: form.categories?.length || 0,
      questionsCount:
        form.categories?.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0) || 0,
    }));

    const totalQuestionsCount = formsDetails.reduce((sum, form) => sum + form.questionsCount, 0);

    return {
      formType: {
        id: formType.id,
        name: formType.name,
        year: formType.year,
        description: formType.description || '',
      },
      formsCount: forms.length,
      publishedFormsCount: publishedForms.length,
      draftFormsCount: draftForms.length,
      totalQuestionsCount,
      forms: formsDetails,
    };
  }
}
