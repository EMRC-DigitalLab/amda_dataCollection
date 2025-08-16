// src/shared/constants/error-messages.ts
export const ERROR_MESSAGES = {
  // General
  INTERNAL_SERVER_ERROR: 'Internal server error occurred',
  VALIDATION_FAILED: 'Validation failed',
  INVALID_REQUEST: 'Invalid request data',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  CONFLICT: 'Resource already exists',

  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN: 'Invalid or malformed token',
  ACCOUNT_DISABLED: 'Account has been disabled',
  EMAIL_NOT_VERIFIED: 'Email address not verified',

  // Database
  DATABASE_CONNECTION_ERROR: 'Database connection error',
  DUPLICATE_ENTRY: 'Duplicate entry found',
  FOREIGN_KEY_CONSTRAINT: 'Related record not found',

  // Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',

  // File Upload
  FILE_TOO_LARGE: 'File size exceeds limit',
  INVALID_FILE_TYPE: 'Invalid file type',

  // Business Logic
  INSUFFICIENT_BALANCE: 'Insufficient account balance',
  PAYMENT_FAILED: 'Payment processing failed',
  METER_NOT_ACTIVE: 'Meter is not active',
  CUSTOMER_SUSPENDED: 'Customer account is suspended',
} as const;
