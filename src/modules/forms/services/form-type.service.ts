import { DataSource } from 'typeorm';
import { FormType, FormTypeStatus } from '../../../database/entities/form-type.entity';
import { FormTypeCreateData, FormTypeQuery, FormTypeStatistics, FormTypeUpdateData } from '../interfaces/form-type.interface';
import { FormTypeRepository } from './../../../database/repositories/forms/form-type.repository';

export class FormTypeService {
  private formTypeRepository: FormTypeRepository;

  constructor(private readonly dataSource: DataSource) {
    this.formTypeRepository = new FormTypeRepository(dataSource);
  }

  async create(data: FormTypeCreateData): Promise<FormType> {
    console.log(data,"this is stye form tyoe")
 

    // Check for duplicate name/year combination
    const existing = await this.formTypeRepository.findByNameAndYear(data.name, data.year);

    if (existing) {
      throw new Error(
        `Form type with name "${data.name}" already exists for year ${data.year}`
      );
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
  async getFormTypeOptions(year?: number, activeOnly = true): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string;
  }>> {
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
}