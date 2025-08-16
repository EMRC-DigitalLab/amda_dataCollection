// src/shared/utils/validator.ts
import { IsPhoneNumber } from 'class-validator';
import { Transform } from 'class-transformer';

// Custom validation decorators
export const IsNigerianPhone = () => {
  return IsPhoneNumber('NG');
};

export const ToUpperCase = () => {
  return Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value));
};

export const ToLowerCase = () => {
  return Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value));
};

export const ToDate = () => {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date;
    }
    return value;
  });
};

export const ToNumber = () => {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }
    return value;
  });
};

// Common validation patterns
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const PHONE_REGEX = /^\+?234[789]\d{9}$/;
export const CUSTOMER_CODE_REGEX = /^AMDA-\d{9}$/;
