import { Router } from 'express';
import { DataSource } from 'typeorm';
import { FormTypeController } from '../controllers/form-type.controller';



export function createFormTypeRoutes(dataSource: DataSource): Router {
  const router = Router();
const formTypeController = new FormTypeController(dataSource);

// Create a new form type
router.post('/',  formTypeController.create);

// Get all form types with filtering and pagination
router.get('/',  formTypeController.findAll);

// Get active form types
router.get('/active', formTypeController.getActive);

// Seed default form types
router.get('/seed-defaults', formTypeController.seedDefaults);

// Get statistics
router.get('/statistics', formTypeController.getStatistics);

// Get default types for a specific year
router.get('/defaults/:year', formTypeController.getDefaultTypes);

// Get form type by ID
router.get('/:id', formTypeController.findById);

// Get form type by slug
router.get('/slug/:slug', formTypeController.findBySlug);

// Update form type
router.put('/:id',  formTypeController.update);
router.patch('/:id',  formTypeController.update);

// Delete form type
router.delete('/:id', formTypeController.delete);

// Bulk update sort order
router.patch('/sort-order/bulk-update', formTypeController.bulkUpdateSortOrder);

// Apply error handler

return router
}


