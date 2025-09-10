import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { MinigridSiteController } from '../controllers/minigrid-site.controller';
import { UpdateMinigridSiteDto } from '../dtos/minigrid-site.dto';

export function createMinigridRoutes(dataSource: DataSource): Router {
  const router = Router();
  const minigridSiteController = new MinigridSiteController();

  // Public routes (if any)
  // router.get('/active', minigridSiteController.getActiveMinigridSites);

  // CRUD operations
  router.post(
    '/',
    authMiddleware,
    // validationMiddleware(CreateMinigridSiteDto),
    minigridSiteController.createMinigridSite
  );

  // Get all minigrid sites (admin/general view)
  router.get('/', authMiddleware, minigridSiteController.getAllMinigridSites);

  // Get current authenticated user's minigrid sites
  router.get('/my-sites', authMiddleware, minigridSiteController.getMyMinigridSites);

  // Get minigrid sites by specific userId
  router.get('/user/:userId', authMiddleware, minigridSiteController.getMinigridSitesByUserId);

  // Get minigrid sites by status
  router.get('/status/:status', authMiddleware, minigridSiteController.getMinigridSitesByStatus);

  // Get user minigrid site statistics
  router.get(
    '/user/:userId/stats',
    authMiddleware,
    minigridSiteController.getUserMinigridSiteStats
  );

  // Get specific minigrid site by ID
  router.get('/:id', authMiddleware, minigridSiteController.getMinigridSiteById);

  // Update minigrid site
  router.put(
    '/:id',
    authMiddleware,
    validationMiddleware(UpdateMinigridSiteDto),
    minigridSiteController.updateMinigridSite
  );

  // Delete minigrid site
  router.delete('/:id', authMiddleware, minigridSiteController.deleteMinigridSite);

  return router;
}
