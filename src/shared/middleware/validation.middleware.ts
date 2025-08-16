// src/shared/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ResponseHelper } from '../utils/response';

export const validationMiddleware = (
  type: any,
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = plainToClass(type, req.body);
      const errors: ValidationError[] = await validate(dto, {
        skipMissingProperties,
        whitelist,
        forbidNonWhitelisted,
      });

      if (errors.length > 0) {
        const validationErrors = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints || {})[0] || 'Validation failed',
          value: error.value,
        }));

        ResponseHelper.validationError(res, validationErrors);
        return;
      }

      req.body = dto;
      next();
    } catch (error) {
      next(error);
    }
  };
};
