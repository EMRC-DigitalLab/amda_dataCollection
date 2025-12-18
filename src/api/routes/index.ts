// src/api/routes/index.ts
// src/api/routes/index.ts (UPDATED)
import { AppDataSource } from '@/config/database';
import { createAuthRoutes } from '@/modules/auth/routes/auth.routes';
import { Router } from 'express';
import { createConnectionsRoutes } from '../../modules/analytics/routes/connections.route';
import { createFinanceRoutes } from '../../modules/analytics/routes/finance.route';
import { createSiteRoutes } from '../../modules/analytics/routes/site.route';
import { createMemberRoutes } from '../../modules/auth/routes/member.route';
import { createCertificateRoutes } from '../../modules/forms/routes/certificate.route';
import { createCompletionRoutes } from '../../modules/forms/routes/completion.route';
import { createExportRoutes } from '../../modules/forms/routes/export.route';
import { createFormSettingsRoutes } from '../../modules/forms/routes/form-settings.route';
import { createFormTypeRoutes } from '../../modules/forms/routes/form-type.route';
import { createFormRoutes } from '../../modules/forms/routes/form.route';
import { createMinigridRoutes } from '../../modules/forms/routes/minigrid-site.route';
import { createNotificationRoutes } from '../../modules/notifications/routes/notification.routes';

export function createApiRouter(): Router {
  const router = Router();

  // register all modules here
  const modules = [
    { path: '/auth', factory: createAuthRoutes },
    { path: '/forms', factory: createFormRoutes },
    { path: '/minigrid-sites', factory: createMinigridRoutes },
    { path: '/form-settings', factory: createFormSettingsRoutes },
    { path: '/members', factory: createMemberRoutes },
    { path: '/analytics/sites', factory: createSiteRoutes },
    { path: '/analytics/connections', factory: createConnectionsRoutes },
    { path: '/analytics/finance', factory: createFinanceRoutes },
    { path: '/completion', factory: createCompletionRoutes },
    { path: '/form-types', factory: createFormTypeRoutes },
    { path: '/notifications', factory: createNotificationRoutes },
    { path: '/certificates', factory: createCertificateRoutes },
    { path: '/exports', factory: createExportRoutes },
  ];



  for (const { path, factory } of modules) {
    router.use(path, factory(AppDataSource));
  }

  return router;
}
