import { Router } from 'express';
import { DataSource } from 'typeorm';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { MinigridSiteController } from '../controllers/minigrid-site.controller';

export function createMinigridRoutes(dataSource: DataSource): Router {
  const router = Router();
  const minigridSiteController = new MinigridSiteController(dataSource);

  // CRUD operations
  router.post('/', authMiddleware, minigridSiteController.createMinigridSite);

  // Get all minigrid sites (admin/general view)
  router.get('/', authMiddleware, minigridSiteController.getAllMinigridSites);

  // Get current authenticated user's minigrid sites
  router.get('/my-sites', authMiddleware, minigridSiteController.getMyMinigridSites);

  // Bulk delete authenticated user's minigrid sites
  router.post(
    '/my-sites/bulk-delete',
    authMiddleware,
    minigridSiteController.bulkDeleteMyMinigridSites
  );

  // Bulk delete minigrid sites (admin)
  router.post('/bulk-delete', authMiddleware, minigridSiteController.bulkDeleteMinigridSites);

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
  router.put('/:id', authMiddleware, minigridSiteController.updateMinigridSite);

  // Delete minigrid site
  router.delete('/:id', authMiddleware, minigridSiteController.deleteMinigridSite);

  return router;
}