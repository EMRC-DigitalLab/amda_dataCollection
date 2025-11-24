// src/config/environment.ts
import * as dotenv from 'dotenv';
import * as joi from 'joi';
import * as path from 'path';

// Load environment file based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'test'
      ? '.env.test'
      : '.env.development';

const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath });

// Environment validation schema
const envVarsSchema = joi
  .object()
  .keys({
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
    PORT: joi.number().default(3000),
    API_PREFIX: joi.string().default('/api/v1'),
    FRONTEND_URL: joi.string().default('http://localhost:5173'), // ADD THIS LINE

    // Database
    DATABASE_HOST: joi.string().required(),
    DATABASE_PORT: joi.number().default(5432),
    DATABASE_USERNAME: joi.string().required(),
    DATABASE_PASSWORD: joi.string().required(),
    DATABASE_NAME: joi.string().required(),
    DATABASE_SYNC: joi.boolean().default(false),
    DATABASE_LOGGING: joi.boolean().default(false),
    DATABASE_SSL: joi.boolean().default(false),

    // Redis
    REDIS_HOST: joi.string().default('localhost'),
    REDIS_PORT: joi.number().default(6379),
    REDIS_PASSWORD: joi.string().allow('').default(''),
    REDIS_TTL: joi.number().default(3600),

    // JWT
    JWT_SECRET: joi.string().required(),
    JWT_EXPIRES_IN: joi.string().default('24h'),
    JWT_REFRESH_SECRET: joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: joi.string().default('7d'),

    // Email
    SMTP_HOST: joi.string().required(),
    SMTP_PORT: joi.number().required(),
    SMTP_SECURE: joi.boolean().default(false), // ADD THIS
    SMTP_USER: joi.string().required(),
    SMTP_PASSWORD: joi.string().required(),
    SMTP_FROM_NAME: joi.string().default('AMDA'), // ADD THIS
    SMTP_FROM_EMAIL: joi.string().email().optional(), // ADD THIS

    // Payment
    PAYMENT_GATEWAY_PUBLIC_KEY: joi.string().required(),
    PAYMENT_GATEWAY_SECRET_KEY: joi.string().required(),
    PAYMENT_GATEWAY_BASE_URL: joi.string().required(),

    // Upload
    UPLOAD_LIMIT: joi.string().default('10mb'),
    UPLOAD_PATH: joi.string().default('./uploads'),

    // Logging
    LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_FILE: joi.string().default('logs/app.log'),

    // Swagger
    SWAGGER_ENABLED: joi.boolean().default(true),

    // Migration settings
    AUTO_GENERATE_MIGRATIONS: joi.boolean().default(false),
    RUN_MIGRATIONS_ON_STARTUP: joi.boolean().default(false),
  })
  .unknown();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

console.log(envVars.DATABASE_HOST, 'databse host');
export const config = {
  environment: envVars.NODE_ENV,
  port: envVars.PORT,
  apiPrefix: envVars.API_PREFIX,
  frontendUrl: envVars.FRONTEND_URL || 'http://localhost:5173', // ADD THIS LINE

  database: {
    host: envVars.DATABASE_HOST,
    port: envVars.DATABASE_PORT,
    username: envVars.DATABASE_USERNAME,
    password: envVars.DATABASE_PASSWORD,
    database: envVars.DATABASE_NAME,
    synchronize: envVars.DATABASE_SYNC,
    logging: envVars.DATABASE_LOGGING,
    ssl: envVars.DATABASE_SSL,
    autoGenerateMigrations: envVars.AUTO_GENERATE_MIGRATIONS,
    runMigrationsOnStartup: envVars.RUN_MIGRATIONS_ON_STARTUP,
  },

  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    ttl: envVars.REDIS_TTL,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },

  email: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    secure: envVars.SMTP_SECURE, // ADD THIS
    user: envVars.SMTP_USER,
    password: envVars.SMTP_PASSWORD,
    fromName: envVars.SMTP_FROM_NAME, // ADD THIS
    from: envVars.SMTP_FROM_EMAIL || envVars.SMTP_USER, // ADD THIS
  },

  payment: {
    publicKey: envVars.PAYMENT_GATEWAY_PUBLIC_KEY,
    secretKey: envVars.PAYMENT_GATEWAY_SECRET_KEY,
    baseUrl: envVars.PAYMENT_GATEWAY_BASE_URL,
  },

  upload: {
    limit: envVars.UPLOAD_LIMIT,
    path: envVars.UPLOAD_PATH,
  },

  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE,
  },

  swagger: {
    enabled: envVars.SWAGGER_ENABLED,
  },
};
