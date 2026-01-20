import { Injectable } from 'injection-js';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';
import { MinigridSiteRepository } from '../../../database/repositories/forms/minigrid-site.repository';
import { AppError } from '../../../shared/middleware/error.middleware';
import { CreateMinigridSiteDto, UpdateMinigridSiteDto } from '../dtos/minigrid-site.dto';
import { IMinigridSiteService, MinigridSiteStats } from '../interfaces/minigrid-site.interface';

@Injectable()
export class MinigridSiteService implements IMinigridSiteService {
  constructor(private readonly minigridSiteRepository: MinigridSiteRepository) {}

  async createMinigridSite(data: CreateMinigridSiteDto): Promise<MinigridSite> {
    const existingMinigridSite = await this.minigridSiteRepository.findByName(data.name);
    if (existingMinigridSite) {
      throw new AppError('Minigrid site with this name already exists', 409);
    }

    return await this.minigridSiteRepository.create(data);
  }

  async getAllMinigridSites(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: MinigridSite[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.minigridSiteRepository.findAll({
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }),
      this.minigridSiteRepository.count(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getMinigridSiteById(id: string): Promise<MinigridSite> {
    const minigridSite = await this.minigridSiteRepository.findById(id);
    if (!minigridSite) {
      throw new AppError('Minigrid site not found', 404);
    }
    return minigridSite;
  }

  async getMinigridSitesByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: MinigridSite[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.minigridSiteRepository.findByUserId(userId, {
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }),
      this.minigridSiteRepository.countByUserId(userId),
    ]);


    return {
      data,
      total: data?.length || 0,
      page,
      limit,
    };
  }

  async getMinigridSitesByStatus(
    status: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: MinigridSite[];
    total: number;
    page: number;
    limit: number;
  }> {
    const validStatuses = [
      'Operational',
      'Under Construction',
      'Planned',
      'Maintenance',
      'Decommissioned',
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Valid statuses are: ${validStatuses.join(', ')}`, 400);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.minigridSiteRepository.findByStatus(status, {
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }),
      this.minigridSiteRepository.countByStatus(status),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getUserMinigridSiteStats(userId: string): Promise<MinigridSiteStats> {
    const userSites = await this.minigridSiteRepository.findByUserId(userId);

    if (userSites.length === 0) {
      return {
        totalSites: 0,
        operationalSites: 0,
        underConstructionSites: 0,
        plannedSites: 0,
        maintenanceSites: 0,
        decommissionedSites: 0,
        totalInstalledCapacity: 0,
        totalConnectedCustomers: 0,
        statusDistribution: [],
      };
    }

    const totalSites = userSites.length;
    const operationalSites = userSites.filter(site => site.status === 'Operational').length;
    const underConstructionSites = userSites.filter(
      site => site.status === 'Under Construction'
    ).length;
    const plannedSites = userSites.filter(site => site.status === 'Planned').length;
    const maintenanceSites = userSites.filter(site => site.status === 'Maintenance').length;
    const decommissionedSites = userSites.filter(site => site.status === 'Decommissioned').length;

    const totalInstalledCapacity = userSites.reduce((sum, site) => {
      const capacity = parseFloat(site.installedCapacityKw) || 0;
      return sum + capacity;
    }, 0);

    const totalConnectedCustomers = userSites.reduce((sum, site) => {
      const customers = parseInt(site.connectedCustomers) || 0;
      return sum + customers;
    }, 0);

    const statusCounts = {
      Operational: operationalSites,
      'Under Construction': underConstructionSites,
      Planned: plannedSites,
      Maintenance: maintenanceSites,
      Decommissioned: decommissionedSites,
    };

    const statusDistribution = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / totalSites) * 100 * 100) / 100,
      }));

    return {
      totalSites,
      operationalSites,
      underConstructionSites,
      plannedSites,
      maintenanceSites,
      decommissionedSites,
      totalInstalledCapacity,
      totalConnectedCustomers,
      statusDistribution,
    };
  }

  async updateMinigridSite(id: string, data: UpdateMinigridSiteDto): Promise<MinigridSite> {
    const existingMinigridSite = await this.minigridSiteRepository.findById(id);
    if (!existingMinigridSite) {
      throw new AppError('Minigrid site not found', 404);
    }

    if (data.name && data.name !== existingMinigridSite.name) {
      const nameConflict = await this.minigridSiteRepository.findByName(data.name);
      if (nameConflict) {
        throw new AppError('Minigrid site with this name already exists', 409);
      }
    }

    const updatedMinigridSite = await this.minigridSiteRepository.update(id, data);
    if (!updatedMinigridSite) {
      throw new AppError('Failed to update minigrid site', 500);
    }

    return updatedMinigridSite;
  }

  async deleteMinigridSite(id: string): Promise<void> {
    const existingMinigridSite = await this.minigridSiteRepository.findById(id);
    if (!existingMinigridSite) {
      throw new AppError('Minigrid site not found', 404);
    }

    const deleted = await this.minigridSiteRepository.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete minigrid site', 500);
    }
  }

  async bulkDeleteMinigridSites(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; message: string }> {
    if (!ids || ids.length === 0) {
      throw new AppError('No site IDs provided for deletion', 400);
    }

    const existingSites = await Promise.all(
      ids.map(id => this.minigridSiteRepository.findById(id))
    );

    const validIds = existingSites.filter(site => site !== null).map(site => site!.id);

    if (validIds.length === 0) {
      throw new AppError('None of the provided site IDs exist', 404);
    }

    const result = await this.minigridSiteRepository.bulkDelete(validIds);

    return {
      success: result.success,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} out of ${ids.length} minigrid sites`,
    };
  }

  async bulkDeleteUserMinigridSites(
    userId: string,
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; message: string }> {
    if (!ids || ids.length === 0) {
      throw new AppError('No site IDs provided for deletion', 400);
    }

    const userSites = await this.minigridSiteRepository.findByUserId(userId);
    const userSiteIds = userSites.map(site => site.id);


    const validIds = ids.filter(id => userSiteIds.includes(id));

    if (validIds.length === 0) {
      throw new AppError('None of the provided sites belong to this user or do not exist', 403);
    }

    const result = await this.minigridSiteRepository.bulkDeleteByUserId(userId, validIds);

    return {
      success: result.success,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} out of ${ids.length} minigrid sites`,
    };
  }
}
