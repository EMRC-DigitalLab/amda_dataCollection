// src/modules/auth/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthService } from '../services/auth.service';
import { ResponseHelper } from '@/shared/utils/response';
import { asyncHandler } from '@/shared/middleware/error.middleware';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export class AuthController {
  private authService: AuthService;

  constructor(private dataSource: DataSource) {
    this.authService = new AuthService(dataSource);
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      ResponseHelper.success(res, result, 'Login successful');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  });

  createMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 401);
      }

      const result = await this.authService.createMember(req.body, adminId);
      ResponseHelper.success(res, result, 'Member created successfully', 201);
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  registerAdmin = asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await this.authService.registerAdmin(req.body);
      ResponseHelper.success(res, result, 'Admin registered successfully', 201);
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return ResponseHelper.error(res, 'Authentication required', 401);
      }

      await this.authService.changePassword(userId, req.body);
      ResponseHelper.success(res, null, 'Password changed successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await this.authService.refreshToken(req.body);
      ResponseHelper.success(res, result, 'Token refreshed successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 401);
    }
  });

  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return ResponseHelper.error(res, 'Authentication required', 401);
      }

      await this.authService.logout(userId);
      ResponseHelper.success(res, null, 'Logged out successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    try {
      await this.authService.forgotPassword(req.body);
      ResponseHelper.success(res, null, 'If the email exists, a reset link has been sent');
    } catch (error: any) {
      ResponseHelper.success(res, null, 'If the email exists, a reset link has been sent');
    }
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    try {
      await this.authService.resetPassword(req.body);
      ResponseHelper.success(res, null, 'Password reset successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return ResponseHelper.error(res, 'Authentication required', 401);
      }

      const user = await this.authService.getProfile(userId);

      const profileData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      ResponseHelper.success(res, profileData, 'Profile retrieved successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 404);
    }
  });
}
