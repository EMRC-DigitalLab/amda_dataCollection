// src/forms/controllers/FormController.ts
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';
import { FormService } from '../services/form.service';

export class FormController {
  private service: FormService;

  constructor(private readonly dataSource: DataSource) {
    this.service = new FormService(new FormRepository(dataSource));
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CreateFormDto;
      const form = await this.service.create(dto);
      res.status(201).json(form);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto: UpdateFormDto = { ...req.body, id: req.params.id };
      const form = await this.service.update(dto);
      res.json(form);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.findById(req.params.id);
      res.json(form);
    } catch (err) {
      next(err);
    }
  };

  findBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.findBySlug(req.params.slug);
      res.json(form);
    } catch (err) {
      next(err);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take } = req.query;
      const [forms, total] = await this.service.findAll({
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
      });
      res.json({ total, data: forms });
    } catch (err) {
      next(err);
    }
  };
}
