// @ts-nocheck
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
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
      next(error);
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
      next(error);
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
      next(error);
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
      next(error);
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
      next(error);
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
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.formTypeService.delete(id);

      res.status(204).send();
    } catch (error) {
      next(error);
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
      next(error);
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
      next(error);
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
      next(error);
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
      next(error);
    }
  };
}
