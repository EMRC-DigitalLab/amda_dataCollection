// src/shared/middleware/admin.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '@/shared/utils/response';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return ResponseHelper.error(res, 'Admin access required', 403);
  }
  next();
};
