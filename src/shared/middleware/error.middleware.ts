// src/shared/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ResponseHelper } from '../utils/response';
import { ERROR_MESSAGES } from '../constants/error-messages';
import { HTTP_STATUS } from '../constants/http-status';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response
  // next: NextFunction
): void => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message: string = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  let code: string | undefined;

  // Rest of your code stays the same...

  // Handle known application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  }

  // Handle specific error types
  else if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    message = ERROR_MESSAGES.VALIDATION_FAILED;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.INVALID_TOKEN;
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.TOKEN_EXPIRED;
    code = 'TOKEN_EXPIRED';
  }

  // Handle database errors
  else if (error.name === 'QueryFailedError') {
    const dbError = error as any;

    if (dbError.code === '23505') {
      // Unique constraint violation
      statusCode = HTTP_STATUS.CONFLICT;
      message = ERROR_MESSAGES.DUPLICATE_ENTRY;
      code = 'DUPLICATE_ENTRY';
    } else if (dbError.code === '23503') {
      // Foreign key constraint
      statusCode = HTTP_STATUS.BAD_REQUEST;
      message = ERROR_MESSAGES.FOREIGN_KEY_CONSTRAINT;
      code = 'FOREIGN_KEY_ERROR';
    }
  }

  // Log error
  logger.error({
    message: error.message,
    statusCode,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send error response
  ResponseHelper.error(res, message, statusCode, error.message, code);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  ResponseHelper.notFound(res, `Route ${req.originalUrl} not found`);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
