import { IMinigridSiteService } from '../interfaces/minigrid-site.interface';
import { AppError } from '../../../shared/middleware/error.middleware';
import { MinigridSite } from '../../../database/entities/minigrid-site.entity';
import { CreateMinigridSiteDto, UpdateMinigridSiteDto } from '../dtos/minigrid-site.dto';
import { MinigridSiteRepository } from '../../../database/repositories/forms/minigrid-site.repository';

export class MinigridSiteService implements IMinigridSiteService {
  private minigridSiteRepository: MinigridSiteRepository;

  constructor() {
    this.minigridSiteRepository = new MinigridSiteRepository();
  }

  async createMinigridSite(data: CreateMinigridSiteDto): Promise<MinigridSite> {
    // Check if minigrid site with same name already exists
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

  async updateMinigridSite(id: string, data: UpdateMinigridSiteDto): Promise<MinigridSite> {
    const existingMinigridSite = await this.minigridSiteRepository.findById(id);
    if (!existingMinigridSite) {
      throw new AppError('Minigrid site not found', 404);
    }

    // Check if name is being updated and if it conflicts with existing
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

  async getActiveMinigridSites(): Promise<MinigridSite[]> {
    return await this.minigridSiteRepository.findActive();
  }
}
