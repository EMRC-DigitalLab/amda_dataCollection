// @ts-nocheck
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
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

export const validateUUIDMiddleware = (paramName: string) => {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (!uuidV4Regex.test(value)) {
      return ResponseHelper.validationError(_res, [
        { field: paramName, message: `${paramName} must be a valid UUID v4` },
      ]);
    }
    next();
  };
};
