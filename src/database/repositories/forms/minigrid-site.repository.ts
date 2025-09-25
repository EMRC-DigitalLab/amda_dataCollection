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

  // New method: Find minigrid sites by userId
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

  // New method: Find minigrid sites by status
  async findByStatus(
    status: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { status: status as any }, // Cast to handle enum type
      // relations: ['forms', 'user'],
      ...options,
    });
  }

  // New method: Find minigrid sites by userId and status
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
      // relations: ['forms', 'user'],
      ...options,
    });
  }

  // New method: Find minigrid sites by region
  async findByRegion(
    region: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { region },
      // relations: ['forms', 'user'],
      ...options,
    });
  }

  // New method: Find minigrid sites by country
  async findByCountry(
    country: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { country },
      // relations: ['forms', 'user'],
      ...options,
    });
  }

  // New method: Find operational minigrid sites
  async findOperational(options?: FindManyOptions<MinigridSite>): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { status: 'Operational' },
      // relations: ['forms', 'user'],
      ...options,
    });
  }

  // New method: Find minigrid sites by generation type
  async findByGenerationType(
    generationType: string,
    options?: FindManyOptions<MinigridSite>
  ): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { generationType },
      // relations: ['forms', 'user'],
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

  // New method: Count minigrid sites by userId
  async countByUserId(userId: string): Promise<number> {
    return await this.repository.count({
      where: { memberId: userId },
    });
  }

  // New method: Count minigrid sites by status
  async countByStatus(status: string): Promise<number> {
    return await this.repository.count({
      where: { status: status as any },
    });
  }

  // New method: Count minigrid sites by userId and status
  async countByUserIdAndStatus(userId: string, status: string): Promise<number> {
    return await this.repository.count({
      where: {
        memberId: userId,
        status: status as any,
      },
    });
  }

  // New method: Count minigrid sites by region
  async countByRegion(region: string): Promise<number> {
    return await this.repository.count({
      where: { region },
    });
  }

  // New method: Count minigrid sites by country
  async countByCountry(country: string): Promise<number> {
    return await this.repository.count({
      where: { country },
    });
  }

  // New method: Count operational minigrid sites
  async countOperational(): Promise<number> {
    return await this.repository.count({
      where: { status: 'Operational' },
    });
  }

  // New method: Get minigrid sites with high capacity (above threshold)
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

  // New method: Get minigrid sites with many customers (above threshold)
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

  // New method: Search minigrid sites by name or location
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

  // New method: Get recently created minigrid sites
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

  // New method: Bulk update minigrid sites
  async bulkUpdate(ids: string[], data: Partial<MinigridSite>): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(MinigridSite)
      .set(data)
      .where('id IN (:...ids)', { ids })
      .execute();

    return result.affected !== 0;
  }

  // async findActive(): Promise<MinigridSite[]> {
  //   return await this.repository.find({
  //     where: { isActive: true },
  //     relations: ['forms'],
  //   });
  // }
}
