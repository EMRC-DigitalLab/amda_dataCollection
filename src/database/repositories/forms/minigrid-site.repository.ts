import { FindManyOptions, Repository } from 'typeorm';
import { MinigridSite } from '../../entities/minigrid-site.entity';
import { AppDataSource } from '../../../config';
import { IMinigridSiteRepository } from '../../../modules/forms/interfaces/minigrid-site.interface';

export class MinigridSiteRepository implements IMinigridSiteRepository {
  private repository: Repository<MinigridSite>;

  constructor() {
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
      relations: ['forms'],
    });
  }

  async findByName(name: string): Promise<MinigridSite | null> {
    return await this.repository.findOne({
      where: { name },
      relations: ['forms'],
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

  async findActive(): Promise<MinigridSite[]> {
    return await this.repository.find({
      where: { isActive: true },
      relations: ['forms'],
    });
  }
}
