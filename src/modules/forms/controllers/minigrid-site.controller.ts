// @ts-nocheck

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { MinigridSiteRepository } from '../../../database/repositories/forms/minigrid-site.repository';
import { AppError } from '../../../shared/middleware/error.middleware';
import { ResponseHelper } from '../../../shared/utils/response';
import { CreateMinigridSiteDto, UpdateMinigridSiteDto } from '../dtos/minigrid-site.dto';
import { MinigridSiteService } from '../services/minigrid.service';

export class MinigridSiteController {
  private minigridSiteService: MinigridSiteService;

  constructor(dataSource: DataSource) {
    this.minigridSiteService = new MinigridSiteService(new MinigridSiteRepository(dataSource));
  }

  createMinigridSite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = plainToClass(CreateMinigridSiteDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors
          .map(error => Object.values(error.constraints || {}).join(', '))
          .join('; ');
        throw new AppError(`Validation failed: ${errorMessages}`, 400);
      }

      const minigridSite = await this.minigridSiteService.createMinigridSite(dto);

      res.status(201).json({
        data: minigridSite,
        message: 'Minigrid site created successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getAllMinigridSites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.minigridSiteService.getAllMinigridSites(page, limit);

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        message: 'Minigrid sites retrieved successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error?.message!, 400);
    }
  };

  getMinigridSiteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const minigridSite = await this.minigridSiteService.getMinigridSiteById(id);

      res.json({
        data: minigridSite,
        message: 'Minigrid site retrieved successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getMinigridSitesByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10000;

      const result = await this.minigridSiteService.getMinigridSitesByUserId(userId, page, limit);

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        message: 'User minigrid sites retrieved successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getMyMinigridSites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1000000000000000;

      const result = await this.minigridSiteService.getMinigridSitesByUserId(userId, page, limit);

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        message: 'My minigrid sites retrieved successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  updateMinigridSite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const dto = plainToClass(UpdateMinigridSiteDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors
          .map(error => Object.values(error.constraints || {}).join(', '))
          .join('; ');
        throw new AppError(`Validation failed: ${errorMessages}`, 400);
      }

      const minigridSite = await this.minigridSiteService.updateMinigridSite(id, dto);

      res.json({
        data: minigridSite,
        message: 'Minigrid site updated successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  deleteMinigridSite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.minigridSiteService.deleteMinigridSite(id);

      res.json({
        message: 'Minigrid site deleted successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  bulkDeleteMinigridSites = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new AppError('IDs must be provided as an array', 400);
      }

      const result = await this.minigridSiteService.bulkDeleteMinigridSites(ids);

      res.json({
        data: result,
        message: result.message,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  bulkDeleteMyMinigridSites = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new AppError('IDs must be provided as an array', 400);
      }

      const result = await this.minigridSiteService.bulkDeleteUserMinigridSites(userId, ids);

      res.json({
        data: result,
        message: result.message,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getMinigridSitesByStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { status } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.minigridSiteService.getMinigridSitesByStatus(status, page, limit);

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
        message: `Minigrid sites with status '${status}' retrieved successfully`,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getUserMinigridSiteStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const stats = await this.minigridSiteService.getUserMinigridSiteStats(userId);

      res.json({
        data: stats,
        message: 'User minigrid site statistics retrieved successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };
}