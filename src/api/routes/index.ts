// src/api/routes/index.ts
// src/api/routes/index.ts (UPDATED)
import { AppDataSource } from '@/config/database';
import { createAuthRoutes } from '@/modules/auth/routes/auth.routes';
import { Router } from 'express';
import { createFormSettingsRoutes } from '../../modules/forms/routes/form-settings.route';
import { createFormRoutes } from '../../modules/forms/routes/form.route';
import { createMinigridRoutes } from '../../modules/forms/routes/minigrid-site.route';
import { createMemberRoutes } from '../../modules/auth/routes/member.route';

export function createApiRouter(): Router {
  const router = Router();

  // register all modules here
  const modules = [
    { path: '/auth', factory: createAuthRoutes },
    { path: '/forms', factory: createFormRoutes },
    { path: '/minigrid-sites', factory: createMinigridRoutes },
    { path: '/form-settings', factory: createFormSettingsRoutes },
    { path: '/members', factory: createMemberRoutes },
    // { path: '/users', factory: createUserRoutes },
    // { path: '/orders', factory: createOrderRoutes },
  ];

  for (const { path, factory } of modules) {
    router.use(path, factory(AppDataSource));
  }

  return router;
}
