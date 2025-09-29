// src/shared/middleware/auth.middleware.ts
import { config } from '@/config';
import { AppDataSource } from '@/config/database';
import { Member } from '@/database/entities/member.entity';
import { User, UserStatus } from '@/database/entities/user.entity';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { ResponseHelper } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    status?: string;
    memberId?: string; // For members
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    avatar?: string;
    lastLoginAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }

    const token = authHeader.substring(7);

    let decoded: any;
    console.log(token, 'this is the token');

    try {
      decoded = jwt.verify(token, config.jwt.secret);
      console.log(decoded, 'this is decoded');
    } catch (error) {
      console.log(error, 'this is the error');
      if (error instanceof jwt.TokenExpiredError) {
        ResponseHelper.unauthorized(res, ERROR_MESSAGES.TOKEN_EXPIRED);
        return;
      }
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.INVALID_TOKEN);
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const memberRepository = AppDataSource.getRepository(Member);

    let authenticatedUser: any = null;

    // Handle member authentication
    if (decoded.role === 'member') {
      const member = await memberRepository.findOne({
        where: { id: decoded.userId },
      });

      if (!member) {
        ResponseHelper.unauthorized(res, ERROR_MESSAGES.INVALID_TOKEN);
        return;
      }

      // if (member.status !== MembershipStatus.ACTIVE) {
      //   ResponseHelper.forbidden(res, 'Member account is not active');
      //   return;
      // }

      // Create user object for member
      authenticatedUser = {
        ...member,
      };

    }
    // Handle admin/user authentication
    else {
      const user = await userRepository.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        ResponseHelper.unauthorized(res, ERROR_MESSAGES.INVALID_TOKEN);
        return;
      }

      if (user.status !== UserStatus.ACTIVE) {
        ResponseHelper.forbidden(res, ERROR_MESSAGES.ACCOUNT_DISABLED);
        return;
      }

      authenticatedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    req.user = authenticatedUser;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(error);
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }

    if (!roles.includes(req.user.role)) {
      ResponseHelper.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

// Middleware specifically for admin routes
export const adminOnly = authorizeRoles('admin');

// Middleware specifically for member routes
export const memberOnly = authorizeRoles('member');

// Middleware for both admin and member
export const adminOrMember = authorizeRoles('admin', 'member');
