// @ts-nocheck
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ResponseHelper } from '../../../shared/utils/response';
import { FormTypeService } from '../services/form-type.service';

export class FormTypeController {
  private formTypeService: FormTypeService;

  constructor(dataSource: DataSource) {
    this.formTypeService = new FormTypeService(dataSource);
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const formType = await this.formTypeService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Form type created successfully',
        data: formType,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.formTypeService.findAll(req.query as any);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const formType = await this.formTypeService.findById(id);

      if (!formType) {
        res.status(404).json({
          success: false,
          message: `Form type with ID ${id} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: formType,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  findBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params;
      const formType = await this.formTypeService.findBySlug(slug);

      if (!formType) {
        res.status(404).json({
          success: false,
          message: `Form type with slug "${slug}" not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: formType,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const formTypes = await this.formTypeService.getActiveFormTypes(year);

      res.json({
        success: true,
        data: formTypes,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const formType = await this.formTypeService.update(id, req.body);

      res.json({
        success: true,
        message: 'Form type updated successfully',
        data: formType,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.formTypeService.delete(id);

      res.status(204).send();
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  forceDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.formTypeService.forceDelete(id);

      res.status(200).json({
        success: true,
        data: result,
        message: `Form type and ${result.deletedForms} forms with ${result.deletedSubmissions} submissions deleted successfully`,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  bulkUpdateSortOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updates = req.body;
      await this.formTypeService.bulkUpdateSortOrder(updates);

      res.json({
        success: true,
        message: 'Sort order updated successfully',
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  seedDefaults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const formTypes = await this.formTypeService.seedDefaultFormTypes();

      res.json({
        success: true,
        message: 'Default form types seeded successfully',
        data: formTypes,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statistics = await this.formTypeService.getStatistics();

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  getDefaultTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = parseInt(req.params.year);
      const formTypes = await this.formTypeService.getDefaultTypes(year);

      res.json({
        success: true,
        data: formTypes,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };
  /**
   * Replicate a form type with all its forms to a new year
   * POST /api/form-types/:id/replicate
   */
  replicateFormType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        targetYear,
        prefix,
        includeDrafts = false,
        preservePublishedStatus = false,
      } = req.body;

      if (!targetYear) {
        res.status(400).json({
          success: false,
          message: 'Target year is required',
        });
        return;
      }

      // Set longer timeout for this operation (5 minutes)
      req.setTimeout(300000);

      console.log(`Replication request received for form type ${id} to year ${targetYear}`);

      const replicatedFormType = await this.formTypeService.replicateFormType(id, targetYear, {
        prefix,
        includeDrafts,
        preservePublishedStatus,
      });

      res.status(201).json({
        success: true,
        message: `Form type successfully replicated to year ${targetYear}`,
        data: replicatedFormType,
      });
    } catch (error) {
      console.error('Replication controller error:', error);
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Replicate a form type to multiple years at once
   * POST /api/form-types/:id/replicate-multiple
   */
  replicateFormTypeToMultipleYears = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        targetYears,
        prefix,
        includeDrafts = false,
        preservePublishedStatus = false,
      } = req.body;

      if (!targetYears || !Array.isArray(targetYears) || targetYears.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Target years array is required',
        });
        return;
      }

      const result = await this.formTypeService.replicateFormTypeToMultipleYears(id, targetYears, {
        prefix,
        includeDrafts,
        preservePublishedStatus,
      });

      res.status(201).json({
        success: true,
        message: `Replication completed. ${result.successful.length} successful, ${result.failed.length} failed`,
        data: {
          successful: result.successful,
          failed: result.failed,
        },
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };

  /**
   * Get replication preview
   * GET /api/form-types/:id/replication-preview
   */
  getReplicationPreview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const preview = await this.formTypeService.getReplicationPreview(id);

      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      ResponseHelper.error(res, error.message, 400);
    }
  };
}
