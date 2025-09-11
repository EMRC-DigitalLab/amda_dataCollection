// routes/form-settings.routes.ts
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { adminMiddleware } from '../../../shared/middleware/admin.middleware';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { authRateLimit } from '../../../shared/middleware/rate-limit.middleware';
import { validateUUIDMiddleware } from '../../../shared/middleware/validation.middleware';
import { FormSettingsController } from '../controllers/form-settings.controller';

export function createFormSettingsRoutes(dataSource: DataSource): Router {
  const router = Router();
  const formSettingsController = new FormSettingsController(dataSource);

  // Apply authentication middleware to all routes
  router.use(authMiddleware);
  // router.use(adminMiddleware); // Only admins can manage form settings

  // Main CRUD operations
  router.post(
    '/',
    adminMiddleware,
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 requests per 15 minutes
    formSettingsController.createFormSettings
  );

  router.get(
    '/',
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 100 }), // 100 requests per 15 minutes
    formSettingsController.listFormSettings
  );

  router.get(
    '/statistics',
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 50 }),
    formSettingsController.getFormSettingsStatistics
  );

  router.get('/templates', authRateLimit, formSettingsController.getFormSettingsTemplates);

  router.post('/validate', authRateLimit, formSettingsController.validateSettings);

  // Settings by ID
  router.get(
    '/:id',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 100 }),
    formSettingsController.getFormSettingsById
  );

  router.put(
    '/:id',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 20 }),
    formSettingsController.updateFormSettings
  );

  router.delete(
    '/:id',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }), // Stricter limit for deletions
    formSettingsController.deleteFormSettings
  );

  // Settings by form ID
  router.get(
    '/form/:formId',
    validateUUIDMiddleware('formId'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 100 }),
    formSettingsController.getFormSettingsByFormId
  );

  // Specialized update endpoints for different settings sections
  router.patch(
    '/:id/access-control',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 20 }),
    formSettingsController.updateAccessControl
  );

  router.patch(
    '/:id/deadline',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 20 }),
    formSettingsController.updateDeadlineSettings
  );

  router.patch(
    '/:id/notifications',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 20 }),
    formSettingsController.updateNotificationSettings
  );

  router.patch(
    '/:id/display',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 20 }),
    formSettingsController.updateDisplaySettings
  );

  router.patch(
    '/:id/security',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 }), // Stricter limit for security changes
    formSettingsController.updateSecuritySettings
  );

  // Utility endpoints
  router.post(
    '/:id/clone',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }),
    formSettingsController.cloneFormSettings
  );

  router.post(
    '/:id/reset',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }),
    formSettingsController.resetFormSettings
  );

  router.get(
    '/:id/export',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 }),
    formSettingsController.exportFormSettings
  );

  router.post(
    '/:id/import',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }),
    formSettingsController.importFormSettings
  );

  router.post(
    '/:id/apply-template',
    validateUUIDMiddleware('id'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 }),
    formSettingsController.applyTemplate
  );

  // Public endpoint for checking form access (no auth required)
  const publicRouter = Router();

  publicRouter.get(
    '/form/:formId/access',
    validateUUIDMiddleware('formId'),
    // rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 200 }), // Higher limit for public access
    formSettingsController.checkFormAccess
  );

  return router;
}
