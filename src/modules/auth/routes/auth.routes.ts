// src/modules/auth/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validationMiddleware } from '@/shared/middleware/validation.middleware';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { authRateLimit } from '@/shared/middleware/rate-limit.middleware';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

const router = Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.post('/login', authRateLimit, validationMiddleware(LoginDto), authController.login);
router.post('/register', validationMiddleware(RegisterDto), authController.register);
router.post('/refresh-token', validationMiddleware(RefreshTokenDto), authController.refreshToken);
router.post('/forgot-password', authRateLimit, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (authentication required)
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);

export default router;
