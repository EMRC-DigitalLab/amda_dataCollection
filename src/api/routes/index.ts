// src/api/routes/index.ts
// src/api/routes/index.ts (UPDATED)
import { Router } from 'express';
import { createAuthRoutes } from '@/modules/auth/routes/auth.routes';

const router = Router();

// Mount module routes
router.use('/auth', createAuthRoutes);

// Health check route for API
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
  });
});

export default router;
