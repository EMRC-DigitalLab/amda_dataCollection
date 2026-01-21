// src/modules/auth/routes/auth.routes.ts
import { adminMiddleware } from '@/shared/middleware/admin.middleware';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { authRateLimit } from '@/shared/middleware/rate-limit.middleware';
import { validationMiddleware } from '@/shared/middleware/validation.middleware';
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { AuthController } from '../controllers/auth.controller';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { RegisterDto } from '../dtos/register.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';

export function createAuthRoutes(dataSource: DataSource): Router {
  const router = Router();
  const authController = new AuthController(dataSource);

  // =================================================================
  // PUBLIC ROUTES (no authentication required)
  // =================================================================

  router.post('/login', validationMiddleware(LoginDto), authController.login);

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

  // =================================================================
  // ADMIN-ONLY ROUTES (restricted access)
  // =================================================================

  router.post('/admin/register', validationMiddleware(RegisterDto), authController.registerAdmin);

  router.post(
    '/admin/create-member',
    validationMiddleware(RegisterDto),
    authController.createMember
  );

  router.get(
    '/admin/users/admins',
    authMiddleware,
    adminMiddleware,
    authController.getAdmins
  );

  // =================================================================
  // MEMBER VERIFICATION ROUTES (Admin only)
  // =================================================================

  // Get all members with verification status (for admin dashboard)
  router.get(
    '/admin/members/verify/all',
    authMiddleware,
    adminMiddleware,
    authController.getAllMembersWithVerificationStatus
  );

  // Get pending verifications (unverified members)
  router.get(
    '/admin/members/verify/pending',
    authMiddleware,
    adminMiddleware,
    authController.getPendingVerifications
  );

  // Get verified members
  router.get(
    '/admin/members/verify/verified',
    authMiddleware,
    adminMiddleware,
    authController.getVerifiedMembers
  );

  // Get members verified by current admin
  router.get(
    '/admin/members/verify/my-verifications',
    authMiddleware,
    adminMiddleware,
    authController.getMyVerifications
  );

  // Search members by verification status
  router.get(
    '/admin/members/verify/search',
    authMiddleware,
    adminMiddleware,
    authController.searchMembers
  );

  // Get member verification history
  router.get(
    '/admin/members/:memberId/verify/history',
    authMiddleware,
    adminMiddleware,
    authController.getMemberVerificationHistory
  );

  // =================================================================
  // PROTECTED ROUTES (authentication required)
  // =================================================================

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
