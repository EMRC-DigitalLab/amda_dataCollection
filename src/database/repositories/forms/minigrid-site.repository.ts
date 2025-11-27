// @ts-nocheck

import { DataSource, FindManyOptions, Repository } from 'typeorm';
import { AppDataSource } from '../../../config';
import { IMinigridSiteRepository } from '../../../modules/forms/interfaces/minigrid-site.interface';
import { MinigridSite } from '../../entities/minigrid-site.entity';

export class MinigridSiteRepository implements IMinigridSiteRepository {
  private repository: Repository<MinigridSite>;

  constructor(dataSource: DataSource) {
    this.repository = AppDataSource.getRepository(MinigridSite);
  }

  async create(data: Partial<MinigridSite>): Promise<MinigridSite> {
    const minigridSite = this.repository.create(data);
    return await this.repository.save(minigridSite);
  }

  async findAll(options?: FindManyOptions<MinigridSite>): Promise<MinigridSite[]> {
    return await this.repository.find({
      relations: ['forms'],
      ...options,
    });
  }

  async findById(id: string): Promise<MinigridSite | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['member'],
    });
  }

  async findByName(name: string): Promise<MinigridSite | null> {
    return await this.repository.findOne({
      where: { name },
    });
  }

  async findByUserId(
    userId: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { memberUuid: userId },
      relations: ['member'],
      ...options,
    });
  }

  async findByStatus(
    status: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { status: status as any },
      ...options,
    });
  }

  async findByUserIdAndStatus(
    userId: string,
    status: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: {
        memberId: userId,
        status: status as any,
      },
      ...options,
    });
  }

  async findByRegion(
    region: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { region },
      ...options,
    });
  }

  async findByCountry(
    country: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { country },
      ...options,
    });
  }

  async findOperational(options?: FindManyOptions<MinigridSite>): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { status: 'Operational' },
      ...options,
    });
  }

  async findByGenerationType(
    generationType: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { generationType },
      ...options,
    });
  }

  async update(id: string, data: Partial<MinigridSite>): Promise<MinigridSite | null> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async count(options?: FindManyOptions<MinigridSite>): Promise<number> {
    return await this.repository.count(options);
  }

  async countByUserId(userId: string): Promise<number> {
    return await this.repository.count({
      where: { memberId: userId },
    });
  }

  async countByStatus(status: string): Promise<number> {
    return await this.repository.count({
      where: { status: status as any },
    });
  }

  async countByUserIdAndStatus(userId: string, status: string): Promise<number> {
    return await this.repository.count({
      where: {
        memberId: userId,
        status: status as any,
      },
    });
  }

  async countByRegion(region: string): Promise<number> {
    return await this.repository.count({
      where: { region },
    });
  }

  async countByCountry(country: string): Promise<number> {
    return await this.repository.count({
      where: { country },
    });
  }

  async countOperational(): Promise<number> {
    return await this.repository.count({
      where: { status: 'Operational' },
    });
  }

  async findHighCapacitySites(
    capacityThreshold: number = 100,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository
      .createQueryBuilder('minigridSite')
      .leftJoinAndSelect('minigridSite.forms', 'forms')
      .leftJoinAndSelect('minigridSite.user', 'user')
      .where('CAST(minigridSite.installedCapacityKw AS DECIMAL) >= :capacity', {
        capacity: capacityThreshold,
      })
      .skip(options?.skip)
      .take(options?.take)
      .orderBy(
        options?.order ? Object.keys(options.order)[0] : 'minigridSite.createdAt',
        options?.order ? (Object.values(options.order)[0] as 'ASC' | 'DESC') : 'DESC'
      )
      .getMany();
  }

  async findHighCustomerSites(
    customerThreshold: number = 50,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository
      .createQueryBuilder('minigridSite')
      .leftJoinAndSelect('minigridSite.forms', 'forms')
      .leftJoinAndSelect('minigridSite.user', 'user')
      .where('CAST(minigridSite.connectedCustomers AS INTEGER) >= :customers', {
        customers: customerThreshold,
      })
      .skip(options?.skip)
      .take(options?.take)
      .orderBy(
        options?.order ? Object.keys(options.order)[0] : 'minigridSite.createdAt',
        options?.order ? (Object.values(options.order)[0] as 'ASC' | 'DESC') : 'DESC'
      )
      .getMany();
  }

  async searchSites(
    searchTerm: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository
      .createQueryBuilder('minigridSite')
      .leftJoinAndSelect('minigridSite.forms', 'forms')
      .leftJoinAndSelect('minigridSite.user', 'user')
      .where('minigridSite.name ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('minigridSite.region ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('minigridSite.district ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('minigridSite.village ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .skip(options?.skip)
      .take(options?.take)
      .orderBy(
        options?.order ? Object.keys(options.order)[0] : 'minigridSite.createdAt',
        options?.order ? (Object.values(options.order)[0] as 'ASC' | 'DESC') : 'DESC'
      )
      .getMany();
  }

  async findRecentSites(
    days: number = 30,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return await this.repository.find({
      where: {
        createdAt: {
          $gte: dateThreshold,
        } as any,
      },
      relations: ['forms', 'user'],
      order: { createdAt: 'DESC' },
      ...options,
    });
  }

  async bulkUpdate(ids: string[], data: Partial<MinigridSite>): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(MinigridSite)
      .set(data)
      .where('id IN (:...ids)', { ids })
      .execute();

    return result.affected !== 0;
  }

  async bulkDelete(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(MinigridSite)
      .where('id IN (:...ids)', { ids })
      .execute();

    return {
      success: result.affected !== 0,
      deletedCount: result.affected || 0,
    };
  }

  async bulkDeleteByUserId(
    userId: string,
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number }> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(MinigridSite)
      .where('id IN (:...ids)', { ids })
      .andWhere('memberUuid = :userId', { userId })
      .execute();

    return {
      success: result.affected !== 0,
      deletedCount: result.affected || 0,
    };
  }
}
