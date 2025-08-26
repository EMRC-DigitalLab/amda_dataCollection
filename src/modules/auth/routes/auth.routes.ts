// src/modules/auth/routes/auth.routes.ts
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { AuthController } from '../controllers/auth.controller';
import { validationMiddleware } from '@/shared/middleware/validation.middleware';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { adminMiddleware } from '@/shared/middleware/admin.middleware'; // You'll need this
import { authRateLimit } from '@/shared/middleware/rate-limit.middleware';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';

export function createAuthRoutes(dataSource: DataSource): Router {
  const router = Router();
  const authController = new AuthController(dataSource);

  // Public routes (no authentication required)
  router.post('/login', authRateLimit, validationMiddleware(LoginDto), authController.login);

  router.post('/refresh-token', validationMiddleware(RefreshTokenDto), authController.refreshToken);

  router.post(
    '/forgot-password',
    authRateLimit,
    validationMiddleware(ForgotPasswordDto),
    authController.forgotPassword
  );

  router.post(
    '/reset-password',
    validationMiddleware(ResetPasswordDto),
    authController.resetPassword
  );

  // Admin-only routes (restricted registration)
  router.post('/admin/register', validationMiddleware(RegisterDto), authController.registerAdmin);

  router.post(
    '/admin/create-member',
    authMiddleware,
    adminMiddleware, // Ensure only admins can create members
    validationMiddleware(RegisterDto),
    authController.createMember
  );

  // Protected routes (authentication required)
  router.post('/logout', authMiddleware, authController.logout);

  router.get('/profile', authMiddleware, authController.getProfile);

  router.put(
    '/change-password',
    authMiddleware,
    validationMiddleware(ChangePasswordDto),
    authController.changePassword
  );

  return router;
}
