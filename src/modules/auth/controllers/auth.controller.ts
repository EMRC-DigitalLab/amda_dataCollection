// src/modules/auth/controllers/auth.controller.ts
import { asyncHandler } from '@/shared/middleware/error.middleware';
import { ResponseHelper } from '@/shared/utils/response';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthService } from '../services/auth.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
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
  const { accessToken, refreshToken, user } =
    await this.authService.login(req.body);      


    res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/auth/refresh',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
    ResponseHelper.success(res, {
      accessToken, user
    }, 'Login successful');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 404);
    }
  });

  createMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // THis is an hardcsoded adminId, since we no ,longer create a member from the admin dashboard
      const adminId = '40d13800-6ba2-4bea-9298-d53334e600cf';
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 404);
      }

      const result = await this.authService.createMember(req.body, adminId);
      ResponseHelper.success(res, result, 'Member created successfully', 201);
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 404);
    }
  });

  registerAdmin = asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await this.authService.registerAdmin(req.body);
      ResponseHelper.success(res, result, 'Admin registered successfully', 201);
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 404);
    }
  });

  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(res, 'Authentication required', 404);
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
      ResponseHelper.error(res, error.message, 404);
    }
  });

  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(res, 'Authentication required', 404);
      }

      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      await this.authService.logout(userId, refreshToken);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth/refresh'
      });

      ResponseHelper.success(res, null, 'Logged out successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 404);
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
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(res, 'Authentication required', 401);
      }

      const user = await this.authService.getProfile(userId);

      ResponseHelper.success(res, user, 'Profile retrieved successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 404);
    }
  });

  /**
   * Verify or unverify a member
   * PATCH /admin/members/:memberId/verify
   */
  verifyMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 401);
      }

      const { memberId } = req.params;
      const { isVerified } = req.body;

      if (typeof isVerified !== 'boolean') {
        return ResponseHelper.error(res, 'isVerified field is required and must be boolean', 400);
      }

      const result = await this.authService.verifyMember(memberId, adminId, { isVerified });

      ResponseHelper.success(res, result, result.message);
    } catch (error: any) {
      ResponseHelper.error(res, error.message, error.status || 400);
    }
  });

  getVerifiedMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const country = req.query.country as string;

      const result = await this.authService.getVerifiedMembers(page, limit, country);

      ResponseHelper.success(
        res,
        {
          ...result,
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
          },
        },
        'Verified members retrieved successfully'
      );
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  /**
   * Get members verified by current admin
   * GET /admin/members/verify/my-verifications
   */
  getMyVerifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.authService.getMembersVerifiedByAdmin(adminId, page, limit);

      ResponseHelper.success(
        res,
        {
          ...result,
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
          },
        },
        'Your verifications retrieved successfully'
      );
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  /**
   * Get pending verifications (unverified members)
   * GET /admin/members/verify/pending
   */
  getPendingVerifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const country = req.query.country as string;

      const result = await this.authService.getPendingVerifications(page, limit, country);

      ResponseHelper.success(
        res,
        {
          ...result,
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
          },
        },
        'Pending verifications retrieved successfully'
      );
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  /**
   * Search members by verification status
   * GET /admin/members/verify/search
   */
  searchMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 401);
      }

      const searchTerm = req.query.q as string;
      if (!searchTerm || searchTerm.trim().length === 0) {
        return ResponseHelper.error(res, 'Search term (q) is required', 400);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const country = req.query.country as string;

      // Handle verified query parameter
      let isVerified: boolean | undefined;
      if (req.query.verified !== undefined) {
        if (req.query.verified === 'true') {
          isVerified = true;
        } else if (req.query.verified === 'false') {
          isVerified = false;
        }
      }

      const result = await this.authService.searchMembers(
        searchTerm.trim(),
        isVerified,
        country,
        page,
        limit
      );

      ResponseHelper.success(
        res,
        {
          ...result,
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
          },
        },
        'Search completed successfully'
      );
    } catch (error: any) {
      ResponseHelper.error(res, error.message, 400);
    }
  });

  /**
   * Get member verification history
   * GET /admin/members/:memberId/verify/history
   */
  getMemberVerificationHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return ResponseHelper.error(res, 'Admin authentication required', 401);
      }

      const { memberId } = req.params;

      const result = await this.authService.getMemberVerificationHistory(memberId);
      ResponseHelper.success(res, result, 'Member verification history retrieved successfully');
    } catch (error: any) {
      ResponseHelper.error(res, error.message, error.status || 400);
    }
  });

  /**
   * Get all members with verification status (for admin dashboard)
   * GET /admin/members/verify/all
   */
  getAllMembersWithVerificationStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const adminId = req.user?.id;
        if (!adminId) {
          return ResponseHelper.error(res, 'Admin authentication required', 401);
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const country = req.query.country as string;
        const status = req.query.status as string; // 'verified' | 'unvedddrified' | 'all'

        let isVerified: boolean | undefined;
        if (status === 'verified') {
          isVerified = true;
        } else if (status === 'unverified') {
          isVerified = false;
        }

        const result = await this.authService.searchMembers(
          '', // Empty search term to get all
          isVerified,
          country,
          page,
          limit
        );

        ResponseHelper.success(
          res,
          {
            ...result,
            pagination: {
              page,
              limit,
              total: result.total,
              hasMore: result.hasMore,
            },
          },
          'Members retrieved successfully'
        );
      } catch (error: any) {
        ResponseHelper.error(res, error.message, 400);
      }
    }
  );
}
