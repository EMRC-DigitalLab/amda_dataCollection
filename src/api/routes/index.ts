// src/api/routes/index.ts
// src/api/routes/index.ts (UPDATED)
import { Router } from 'express';
import { createAuthRoutes } from '@/modules/auth/routes/auth.routes';
import { AppDataSource } from '@/config/database';

export function createApiRouter(): Router {
  const router = Router();

  // register all modules here
  const modules = [
    { path: '/auth', factory: createAuthRoutes },
    // { path: '/users', factory: createUserRoutes },
    // { path: '/orders', factory: createOrderRoutes },
  ];

  for (const { path, factory } of modules) {
    router.use(path, factory(AppDataSource));
  }

  return router;
}
