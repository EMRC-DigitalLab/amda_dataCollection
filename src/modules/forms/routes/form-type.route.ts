import { adminMiddleware } from '@/shared/middleware/admin.middleware';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { FormTypeController } from '../controllers/form-type.controller';

export function createFormTypeRoutes(dataSource: DataSource): Router {
  const router = Router();
  const formTypeController = new FormTypeController(dataSource);

  // Public routes
  // Get all form types with filtering and pagination
  router.get('/', formTypeController.findAll);

  // Get active form types
  router.get('/active', formTypeController.getActive);

  // Get statistics
  router.get('/statistics', formTypeController.getStatistics);

  // Get default types for a specific year
  router.get('/defaults/:year', formTypeController.getDefaultTypes);

  // Get form type by ID
  router.get('/:id', formTypeController.findById);

  // Get form type by slug
  router.get('/slug/:slug', formTypeController.findBySlug);

  // Admin-only routes
  // Create a new form type
  router.post('/', authMiddleware, adminMiddleware, formTypeController.create);

  // Seed default form types
  router.post('/seed-defaults', authMiddleware, adminMiddleware, formTypeController.seedDefaults);

  // Get replication preview (shows what will be replicated)
  router.get(
    '/:id/replication-preview',
    authMiddleware,
    adminMiddleware,
    formTypeController.getReplicationPreview
  );

  // Replicate form type to a single year
  router.post(
    '/:id/replicate',
    authMiddleware,
    adminMiddleware,
    formTypeController.replicateFormType
  );

  // Replicate form type to multiple years
  router.post(
    '/:id/replicate-multiple',
    authMiddleware,
    adminMiddleware,
    formTypeController.replicateFormTypeToMultipleYears
  );

  // Update form type
  router.put('/:id', authMiddleware, adminMiddleware, formTypeController.update);
  router.patch('/:id', authMiddleware, adminMiddleware, formTypeController.update);

  // Delete form type
  router.delete('/:id', authMiddleware, adminMiddleware, formTypeController.delete);

  // Bulk update sort order
  router.patch(
    '/sort-order/bulk-update',
    authMiddleware,
    adminMiddleware,
    formTypeController.bulkUpdateSortOrder
  );

  return router;
}
