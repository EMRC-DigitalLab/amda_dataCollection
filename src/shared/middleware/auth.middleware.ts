// src/shared/middleware/auth.middleware.ts
import { config } from '@/config';
import { AppDataSource } from '@/config/database';
import { User, UserStatus } from '@/database/entities/user.entity';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { ResponseHelper } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: User;
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
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        ResponseHelper.unauthorized(res, ERROR_MESSAGES.TOKEN_EXPIRED);
        return;
      }
      ResponseHelper.unauthorized(res, ERROR_MESSAGES.INVALID_TOKEN);
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
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

    req.user = user;
    next();
  } catch (error) {
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
