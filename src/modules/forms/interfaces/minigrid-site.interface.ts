import { FindManyOptions } from 'typeorm';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';
import { CreateMinigridSiteDto, UpdateMinigridSiteDto } from '../dtos/minigrid-site.dto';

export interface IMinigridSiteRepository {
  create(data: Partial<MinigridSite>): Promise<MinigridSite>;
  findAll(options?: FindManyOptions<MinigridSite>): Promise<MinigridSite[]>;
  findById(id: string): Promise<MinigridSite | null>;
  findByName(name: string): Promise<MinigridSite | null>;
  update(id: string, data: Partial<MinigridSite>): Promise<MinigridSite | null>;
  delete(id: string): Promise<boolean>;
  count(options?: FindManyOptions<MinigridSite>): Promise<number>;
  findActive(): Promise<MinigridSite[]>;
}

export interface IMinigridSiteService {
  createMinigridSite(data: CreateMinigridSiteDto): Promise<MinigridSite>;
  getAllMinigridSites(
    page?: number,
    limit?: number
  ): Promise<{ data: MinigridSite[]; total: number; page: number; limit: number }>;
  getMinigridSiteById(id: string): Promise<MinigridSite>;
  updateMinigridSite(id: string, data: UpdateMinigridSiteDto): Promise<MinigridSite>;
  deleteMinigridSite(id: string): Promise<void>;
  getActiveMinigridSites(): Promise<MinigridSite[]>;
}
