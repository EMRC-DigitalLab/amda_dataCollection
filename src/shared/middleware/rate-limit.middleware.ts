// src/shared/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import { ResponseHelper } from '../utils/response';
import { ERROR_MESSAGES } from '../constants/error-messages';

export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || ERROR_MESSAGES.TOO_MANY_REQUESTS,
    handler: (req: any, res: any) => {
      ResponseHelper.error(res, message || ERROR_MESSAGES.TOO_MANY_REQUESTS, 429);
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Common rate limits
export const generalRateLimit = createRateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5); // 5 login attempts per 15 minutes
export const apiRateLimit = createRateLimit(60 * 1000, 60); // 60 requests per minute
