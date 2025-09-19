
import { DataSource, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { FormTypeCreateData, FormTypeQuery, FormTypeStatistics, IFormTypeRepository, SortOrderUpdate } from '../../../modules/forms/interfaces/form-type.interface';
import { FormType, FormTypeStatus } from '../../entities/form-type.entity';

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

    queryBuilder
      .orderBy('formType.sortOrder', 'ASC')
      .addOrderBy('formType.name', 'ASC');

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
}