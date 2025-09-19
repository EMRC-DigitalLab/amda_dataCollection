// src/shared/utils/response.ts
import { Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status';
import {
  ApiResponse,
  ErrorResponse,
  PaginationMeta,
  ValidationErrorResponse,
} from '../types/api.types';

export class ResponseHelper {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = HTTP_STATUS.OK,
    meta?: PaginationMeta
  ): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response<ApiResponse<T>> {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static error(
    res: Response,
    message: string | any,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    error?: string,
    code?: string,
    details?: any
  ): Response<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      message,
      ...(error && { error }),
      ...(code && { code }),
      ...(details && { details }),
    };

    return res.status(statusCode).json(response);
  }

  static badRequest(
    res: Response,
    message: string = 'Bad request',
    error?: string
  ): Response<ErrorResponse> {
    return this.error(res, message, HTTP_STATUS.BAD_REQUEST, error);
  }

  static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    error?: string
  ): Response<ErrorResponse> {
    return this.error(res, message, HTTP_STATUS.UNAUTHORIZED, error);
  }

  static forbidden(
    res: Response,
    message: string = 'Forbidden',
    error?: string
  ): Response<ErrorResponse> {
    return this.error(res, message, HTTP_STATUS.FORBIDDEN, error);
  }

  static notFound(
    res: Response,
    message: string = 'Resource not found',
    error?: string
  ): Response<ErrorResponse> {
    return this.error(res, message, HTTP_STATUS.NOT_FOUND, error);
  }

  static conflict(
    res: Response,
    message: string = 'Resource already exists',
    error?: string
  ): Response<ErrorResponse> {
    return this.error(res, message, HTTP_STATUS.CONFLICT, error);
  }

  static validationError(
    res: Response,
    errors: Array<{ field: string; message: string; value?: any }>,
    message: string = 'Validation failed'
  ): Response<ValidationErrorResponse> {
    const response: ValidationErrorResponse = {
      success: false,
      message,
      errors,
    };

    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(response);
  }
}
