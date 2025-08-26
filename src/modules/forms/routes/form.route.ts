// src/modules/forms/routes/form.routes.ts
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { FormController } from '../controllers/form.controller';
import { validationMiddleware } from '@/shared/middleware/validation.middleware';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { adminMiddleware } from '@/shared/middleware/admin.middleware';
import { CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';


export function createFormRoutes(dataSource: DataSource): Router {
  const router = Router();
  const formController = new FormController(dataSource);

  /* Public routes */
  router.get('/',                formController.findAll);
  router.get('/slug/:slug',      formController.findBySlug);
  router.get('/:id',             formController.findById);

  /* Admin-only mutating routes */
  router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    validationMiddleware(CreateFormDto),
    formController.create
  );

  router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    validationMiddleware(UpdateFormDto),
    formController.update
  );

  router.delete(
    '/:id',
    authMiddleware,
    adminMiddleware,
    formController.delete
  );

  return router;
}