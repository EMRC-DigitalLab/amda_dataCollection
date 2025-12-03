// @ts-nocheck
import { DataSource, Not, Repository, SelectQueryBuilder } from 'typeorm';
import {
  FormTypeCreateData,
  FormTypeQuery,
  FormTypeStatistics,
  IFormTypeRepository,
  SortOrderUpdate,
} from '../../../modules/forms/interfaces/form-type.interface';
import { Category } from '../../entities/category.entity';
import { FormType, FormTypeStatus } from '../../entities/form-type.entity';
import { Form } from '../../entities/form.entity';
import { Question } from '../../entities/question.entity';

export class FormTypeRepository implements IFormTypeRepository {
  private readonly repository: Repository<FormType>;
  private readonly dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(FormType); // Fixed: use passed dataSource
    this.dataSource = dataSource;
  }

  async create(formTypeData: Partial<FormType>): Promise<FormType> {
    const formType = this.repository.create(formTypeData);
    return this.repository.save(formType);
  }

  async save(formType: FormTypeCreateData): Promise<FormType> {
    return this.repository.save(formType);
  }

  async findById(id: string): Promise<FormType | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['forms'],
    });
  }

  async findBySlug(slug: string): Promise<FormType | null> {
    return this.repository.findOne({
      where: { slug },
      relations: ['forms'],
    });
  }

  async findByNameAndYear(name: string, year: number): Promise<FormType | null> {
    return this.repository.findOne({
      where: { name, year },
    });
  }

  async findByNameAndYearExcludingId(
    name: string,
    year: number,
    excludeId: string
  ): Promise<FormType | null> {
    return this.repository.findOne({
      where: { name, year, id: Not(excludeId) },
    });
  }

  async findAllWithFilters(query: FormTypeQuery): Promise<[FormType[], number]> {
    const { page = 1, limit = 10, year, status, isPublic, isDefault, search } = query;

    const queryBuilder = this.repository.createQueryBuilder('formType');

    // Apply filters
    this.applyFilters(queryBuilder, { year, status, isPublic, isDefault, search });

    // Order by sortOrder and then by name
    queryBuilder.orderBy('formType.sortOrder', 'ASC').addOrderBy('formType.name', 'ASC');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    return queryBuilder.getManyAndCount();
  }

  async findActiveAndPublic(year?: number): Promise<FormType[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('formType')
      .where('formType.status = :status', { status: FormTypeStatus.ACTIVE })
      .andWhere('formType.isPublic = :isPublic', { isPublic: true });

    if (year) {
      queryBuilder.andWhere('formType.year = :year', { year });
    }

    return queryBuilder
      .orderBy('formType.sortOrder', 'ASC')
      .addOrderBy('formType.name', 'ASC')
      .getMany();
  }

  async findByYear(year: number): Promise<FormType[]> {
    return this.repository.find({
      where: { year },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByStatus(status: FormTypeStatus): Promise<FormType[]> {
    return this.repository.find({
      where: { status },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findDefaultTypes(year: number): Promise<FormType[]> {
    return this.repository.find({
      where: { isDefault: true, year },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async update(id: string, updateData: Partial<FormType>): Promise<FormType> {
    await this.repository.update(id, updateData);
    const updatedFormType = await this.findById(id);
    if (!updatedFormType) {
      throw new Error(`Form type with ID ${id} not found after update`);
    }
    return updatedFormType;
  }

  async delete(formType: FormType): Promise<void> {
    await this.repository.remove(formType);
  }

  async deleteById(id: string): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new Error(`Form type with ID ${id} not found`);
    }
  }

  async bulkUpdateSortOrder(updates: SortOrderUpdate[]): Promise<void> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const update of updates) {
        await queryRunner.manager.update(FormType, update.id, { sortOrder: update.sortOrder });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async countByStatus(status: FormTypeStatus): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  async countByYear(year: number): Promise<number> {
    return this.repository.count({ where: { year } });
  }

  async getStatistics(): Promise<FormTypeStatistics> {
    const total = await this.count();
    const active = await this.countByStatus(FormTypeStatus.ACTIVE);
    const inactive = await this.countByStatus(FormTypeStatus.INACTIVE);
    const archived = await this.countByStatus(FormTypeStatus.ARCHIVED);

    return { total, active, inactive, archived };
  }

  async existsByNameAndYear(name: string, year: number): Promise<boolean> {
    const count = await this.repository.count({ where: { name, year } });
    return count > 0;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.repository.count({ where: { slug } });
    return count > 0;
  }

  async findWithFormsCount(): Promise<FormType[]> {
    return this.repository
      .createQueryBuilder('formType')
      .leftJoinAndSelect('formType.forms', 'forms')
      .loadRelationCountAndMap('formType.formsCount', 'formType.forms')
      .orderBy('formType.sortOrder', 'ASC')
      .addOrderBy('formType.name', 'ASC')
      .getMany();
  }

  async findUnusedFormTypes(): Promise<FormType[]> {
    return this.repository
      .createQueryBuilder('formType')
      .leftJoin('formType.forms', 'forms')
      .where('forms.id IS NULL')
      .orderBy('formType.sortOrder', 'ASC')
      .addOrderBy('formType.name', 'ASC')
      .getMany();
  }

  async archiveOldFormTypes(beforeYear: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(FormType)
      .set({ status: FormTypeStatus.ARCHIVED })
      .where('year < :beforeYear', { beforeYear })
      .andWhere('status != :status', { status: FormTypeStatus.ARCHIVED })
      .execute();

    return result.affected || 0;
  }

  async reorderFormTypes(orderedIds: string[]): Promise<void> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await queryRunner.manager.update(FormType, orderedIds[i], { sortOrder: i });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async searchFormTypes(searchTerm: string, limit?: number): Promise<FormType[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('formType')
      .where('(formType.name ILIKE :search OR formType.description ILIKE :search)', {
        search: `%${searchTerm}%`,
      })
      .orderBy('formType.sortOrder', 'ASC')
      .addOrderBy('formType.name', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

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
    const queryBuilder = this.repository
      .createQueryBuilder('formType')
      .select(['formType.id', 'formType.name', 'formType.slug', 'formType.color', 'formType.icon']);

    if (activeOnly) {
      queryBuilder.where('formType.status = :status', { status: FormTypeStatus.ACTIVE });
    }

    if (year) {
      queryBuilder.andWhere('formType.year = :year', { year });
    }

    queryBuilder.orderBy('formType.sortOrder', 'ASC').addOrderBy('formType.name', 'ASC');

    const formTypes = await queryBuilder.getMany();

    return formTypes.map(ft => ({
      id: ft.id,
      name: ft.name,
      slug: ft.slug,
      color: ft.color,
      icon: ft.icon,
    }));
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<FormType>,
    filters: {
      year?: number;
      status?: FormTypeStatus;
      isPublic?: boolean;
      isDefault?: boolean;
      search?: string;
    }
  ): void {
    const { year, status, isPublic, isDefault, search } = filters;

    if (year) {
      queryBuilder.andWhere('formType.year = :year', { year });
    }

    if (status) {
      queryBuilder.andWhere('formType.status = :status', { status });
    }

    if (typeof isPublic === 'boolean') {
      queryBuilder.andWhere('formType.isPublic = :isPublic', { isPublic });
    }

    if (typeof isDefault === 'boolean') {
      queryBuilder.andWhere('formType.isDefault = :isDefault', { isDefault });
    }

    if (search) {
      queryBuilder.andWhere('(formType.name ILIKE :search OR formType.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }
  }

  /**
   * Clone a form type with all its forms for a new year
   * Uses optimized approach to prevent timeouts
   */
  async cloneFormTypeWithForms(
    sourceFormTypeId: string,
    targetYear: number,
    options?: {
      prefix?: string;
      includeDrafts?: boolean;
      preservePublishedStatus?: boolean;
    }
  ): Promise<FormType> {
    try {
      console.log(`=== Starting replication ===`);
      console.log(`Source Form Type ID: ${sourceFormTypeId}`);
      console.log(`Target Year: ${targetYear}`);
      console.log(`Options:`, options);

      // Step 1: Get source form type with explicit query builder for better control
      const sourceFormType = await this.repository
        .createQueryBuilder('formType')
        .leftJoinAndSelect('formType.forms', 'forms')
        .leftJoinAndSelect('forms.categories', 'categories')
        .leftJoinAndSelect('categories.questions', 'questions')
        .where('formType.id = :id', { id: sourceFormTypeId })
        .orderBy('forms.createdAt', 'ASC')
        .addOrderBy('categories.sortOrder', 'ASC')
        .addOrderBy('questions.sortOrder', 'ASC')
        .getOne();

      if (!sourceFormType) {
        throw new Error(`Form type with ID ${sourceFormTypeId} not found`);
      }

      console.log(`✓ Source form type loaded: ${sourceFormType.name}`);
      console.log(`✓ Total forms in source: ${sourceFormType.forms?.length || 0}`);

      // Debug: Check what we loaded
      if (sourceFormType.forms && sourceFormType.forms.length > 0) {
        sourceFormType.forms.forEach((form, idx) => {
          console.log(`  Form ${idx + 1}: ${form.title} (ID: ${form.id})`);
          console.log(`    - Categories: ${form.categories?.length || 0}`);
          if (form.categories) {
            form.categories.forEach((cat, catIdx) => {
              console.log(`      Category ${catIdx + 1}: ${cat.name} (ID: ${cat.id})`);
              console.log(`        - Questions: ${cat.questions?.length || 0}`);
            });
          }
        });
      }

      // Step 2: Validate year
      const existingFormType = await this.findByNameAndYear(sourceFormType.name, targetYear);
      if (existingFormType) {
        throw new Error(`Form type "${sourceFormType.name}" already exists for year ${targetYear}`);
      }

      // Step 3: Generate unique slug for new form type
      const namePrefix = options?.prefix || '';
      const newName = `${namePrefix}${sourceFormType.name}`.trim();
      const baseSlug = this.generateSlug(newName, targetYear);

      let newSlug = baseSlug;
      let slugCounter = 1;

      while (await this.existsBySlug(newSlug)) {
        newSlug = `${baseSlug}-${slugCounter}`;
        slugCounter++;
      }

      console.log(`✓ Generated new slug: ${newSlug}`);

      // Step 4: Create new form type (separate quick transaction)
      const newFormType = await this.repository.save({
        name: newName,
        description: sourceFormType.description,
        slug: newSlug,
        year: targetYear,
        icon: sourceFormType.icon,
        color: sourceFormType.color,
        sortOrder: sourceFormType.sortOrder,
        isPublic: sourceFormType.isPublic,
        isDefault: sourceFormType.isDefault,
        status: sourceFormType.status,
      });

      console.log(`✓ Created new form type with ID: ${newFormType.id}`);

      // Step 5: Filter forms to clone
      const formsToClone = options?.includeDrafts
        ? sourceFormType.forms || []
        : (sourceFormType.forms || []).filter(f => f.status === 'PUBLISHED');

      console.log(`\n✓ Forms to clone: ${formsToClone.length}`);

      // Step 6: Clone forms one by one
      for (let i = 0; i < formsToClone.length; i++) {
        const sourceForm = formsToClone[i];
        console.log(`\n--- Cloning form ${i + 1}/${formsToClone.length}: ${sourceForm.title} ---`);

        try {
          await this.cloneSingleForm(
            sourceForm,
            newFormType.id,
            targetYear,
            options?.preservePublishedStatus || false
          );
          console.log(`  ✓ Successfully cloned: ${sourceForm.title}`);
        } catch (error) {
          console.error(`  ✗ Failed to clone form "${sourceForm.title}":`, error);
          // Continue with other forms instead of failing completely
        }
      }

      console.log(`\n=== Replication completed ===`);

      // Step 7: Return the new form type with all relations
      const result = await this.repository
        .createQueryBuilder('formType')
        .leftJoinAndSelect('formType.forms', 'forms')
        .leftJoinAndSelect('forms.categories', 'categories')
        .leftJoinAndSelect('categories.questions', 'questions')
        .where('formType.id = :id', { id: newFormType.id })
        .orderBy('forms.createdAt', 'ASC')
        .addOrderBy('categories.sortOrder', 'ASC')
        .addOrderBy('questions.sortOrder', 'ASC')
        .getOne();

      if (!result) {
        throw new Error('Failed to retrieve newly created form type');
      }

      console.log(`✓ Result form type has ${result.forms?.length || 0} forms`);

      return result;
    } catch (error) {
      console.error('=== Replication failed ===');
      console.error(error);
      throw error;
    }
  }

  private async cloneSingleForm(
    sourceForm: Form,
    newFormTypeId: string,
    targetYear: number,
    preservePublishedStatus: boolean
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Generate unique slug for the form
      const formBaseSlug = sourceForm.slug.replace(/-\d{4}$/, '');
      let formSlug = `${formBaseSlug}-${targetYear}`;

      // Check if slug exists
      let slugExists = await queryRunner.manager.exists(Form, {
        where: { slug: formSlug },
      });

      let counter = 1;
      while (slugExists) {
        formSlug = `${formBaseSlug}-${targetYear}-${counter}`;
        slugExists = await queryRunner.manager.exists(Form, {
          where: { slug: formSlug },
        });
        counter++;
      }

      console.log(`  → Creating form with slug: ${formSlug}`);

      // Step 2: Create new form entity
      const newForm = queryRunner.manager.create(Form, {
        title: sourceForm.title,
        slug: formSlug,
        description: sourceForm.description,
        formTypeId: newFormTypeId,
        status: preservePublishedStatus ? sourceForm.status : 'DRAFT',
        adminId: sourceForm.adminId,
        submissionScope: sourceForm.submissionScope,
        allowOnlyOneSubmissionPerScope: sourceForm.allowOnlyOneSubmissionPerScope,
        requireAllScopesSubmission: sourceForm.requireAllScopesSubmission,
        isAnonymous: sourceForm.isAnonymous || false,
        allowMultipleSubmissions: sourceForm.allowMultipleSubmissions || false,
        maxSubmissions: sourceForm.maxSubmissions,
        tableCreated: false,
        tableName: null,
      });

      const savedForm = await queryRunner.manager.save(Form, newForm);
      console.log(`  ✓ Form created with ID: ${savedForm.id}`);

      // Step 3: Verify we have categories
      if (!sourceForm.categories || sourceForm.categories.length === 0) {
        console.log(`  ⚠ WARNING: No categories found for form: ${sourceForm.title}`);
        console.log(`  Source form ID: ${sourceForm.id}`);
        await queryRunner.commitTransaction();
        return;
      }

      console.log(`  → Cloning ${sourceForm.categories.length} categories...`);

      // Step 4: Clone categories and questions
      for (const sourceCategory of sourceForm.categories) {
        console.log(`    → Creating category: ${sourceCategory.name}`);

        // Create category entity
        const newCategory = queryRunner.manager.create(Category, {
          name: sourceCategory.name,
          slug: sourceCategory.slug,
          sortOrder: sourceCategory.sortOrder,
          form: savedForm, // Use the saved form entity
        });

        const savedCategory = await queryRunner.manager.save(Category, newCategory);
        console.log(`    ✓ Category created with ID: ${savedCategory.id}`);

        // Step 5: Clone questions for this category
        if (sourceCategory.questions && sourceCategory.questions.length > 0) {
          console.log(`      → Creating ${sourceCategory.questions.length} questions...`);

          for (const sourceQuestion of sourceCategory.questions) {
            const newQuestion = queryRunner.manager.create(Question, {
              kpi: sourceQuestion.kpi,
              slug: sourceQuestion.slug,
              description: sourceQuestion.description,
              type: sourceQuestion.type,
              required: sourceQuestion.required,
              sortOrder: sourceQuestion.sortOrder,
              options: sourceQuestion.options,
              validation: sourceQuestion.validation,
              category: savedCategory, // Use the saved category entity
            });

            await queryRunner.manager.save(Question, newQuestion);
          }

          console.log(`      ✓ ${sourceCategory.questions.length} questions created`);
        } else {
          console.log(`      ⚠ No questions found for category: ${sourceCategory.name}`);
        }
      }

      await queryRunner.commitTransaction();
      console.log(`  ✓ Form "${sourceForm.title}" cloned successfully with all data`);
    } catch (error) {
      console.error(`  ✗ Error cloning form "${sourceForm.title}":`, error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
