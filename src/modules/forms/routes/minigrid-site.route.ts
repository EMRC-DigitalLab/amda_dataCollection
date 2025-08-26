import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { MinigridSiteController } from '../controllers/minigrid-site.controller';
import { CreateMinigridSiteDto, UpdateMinigridSiteDto } from '../dtos/minigrid-site.dto';

export function createMinigridRoutes(dataSource: DataSource): Router {
  const router = Router();
  const minigridSiteController = new MinigridSiteController();

  // Public routes (if any)
  router.get('/active', minigridSiteController.getActiveMinigridSites);


  // CRUD operations
  router.post(
    '/',
    authMiddleware,
    validationMiddleware(CreateMinigridSiteDto),
    minigridSiteController.createMinigridSite
  );
  router.get('/', authMiddleware, minigridSiteController.getAllMinigridSites);
  router.get('/:id', authMiddleware, minigridSiteController.getMinigridSiteById);
  router.put(
    '/:id',
    authMiddleware,
    validationMiddleware(UpdateMinigridSiteDto),
    minigridSiteController.updateMinigridSite
  );
  router.delete('/:id', authMiddleware, minigridSiteController.deleteMinigridSite);

  return router;
}
