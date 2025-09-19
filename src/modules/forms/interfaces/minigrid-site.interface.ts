import { FindManyOptions } from 'typeorm';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';
import { CreateMinigridSiteDto, UpdateMinigridSiteDto } from '../dtos/minigrid-site.dto';

export interface IMinigridSiteRepository {
  create(data: Partial<MinigridSite>): Promise<MinigridSite>;
  findAll(options?: FindManyOptions<MinigridSite>): Promise<MinigridSite[]>;
  findById(id: string): Promise<MinigridSite | null>;
  findByName(name: string): Promise<MinigridSite | null>;
  findByUserId(userId: string, options?: FindManyOptions<MinigridSite>): Promise<MinigridSite[]>;
  findByStatus(status: string, options?: FindManyOptions<MinigridSite>): Promise<MinigridSite[]>;
  update(id: string, data: Partial<MinigridSite>): Promise<MinigridSite | null>;
  delete(id: string): Promise<boolean>;
  count(options?: FindManyOptions<MinigridSite>): Promise<number>;
  countByUserId(userId: string): Promise<number>;
  countByStatus(status: string): Promise<number>;
  // findActive(): Promise<MinigridSite[]>;
}

export interface MinigridSiteStats {
  totalSites: number;
  operationalSites: number;
  underConstructionSites: number;
  plannedSites: number;
  maintenanceSites: number;
  decommissionedSites: number;
  totalInstalledCapacity: number;
  totalConnectedCustomers: number;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface IMinigridSiteService {
  createMinigridSite(data: CreateMinigridSiteDto): Promise<MinigridSite>;
  getAllMinigridSites(
    page?: number,
    limit?: number
  ): Promise<{ data: MinigridSite[]; total: number; page: number; limit: number }>;
  getMinigridSiteById(id: string): Promise<MinigridSite>;
  getMinigridSitesByUserId(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<{ data: MinigridSite[]; total: number; page: number; limit: number }>;
  getMinigridSitesByStatus(
    status: string,
    page?: number,
    limit?: number
  ): Promise<{ data: MinigridSite[]; total: number; page: number; limit: number }>;
  getUserMinigridSiteStats(userId: string): Promise<MinigridSiteStats>;
  updateMinigridSite(id: string, data: UpdateMinigridSiteDto): Promise<MinigridSite>;
  deleteMinigridSite(id: string): Promise<void>;
  // getActiveMinigridSites(): Promise<MinigridSite[]>;
}
