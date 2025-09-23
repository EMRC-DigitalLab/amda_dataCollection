// src/main.ts (Updated with enhanced Swagger setup and Secure CORS)
import path from 'path';
import moduleAlias from 'module-alias';
import 'module-alias/register';
import compression from 'compression';

// Smart environment detection
const isProduction = process.env.NODE_ENV === 'production' || __filename.includes('/dist/');

if (isProduction) {
  moduleAlias.addAliases({
    '@': path.resolve(__dirname, '.'),
    '@/config': path.resolve(__dirname, 'config'),
    '@/shared': path.resolve(__dirname, 'shared'),
    '@/database': path.resolve(__dirname, 'database'),
    '@/modules': path.resolve(__dirname, 'modules'),
    '@/api': path.resolve(__dirname, 'api'),
  });
} else {
  const srcPath = path.resolve(__dirname);
  moduleAlias.addAliases({
    '@': srcPath,
    '@/config': path.resolve(srcPath, 'config'),
    '@/shared': path.resolve(srcPath, 'shared'),
    '@/database': path.resolve(srcPath, 'database'),
    '@/modules': path.resolve(srcPath, 'modules'),
    '@/api': path.resolve(srcPath, 'api'),
  });
}
import 'reflect-metadata';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import 'reflect-metadata';
import swaggerUi from 'swagger-ui-express';

import { createApiRouter } from '@/api/routes';
import { getSwaggerInfo, swaggerSpec } from '@/api/swagger/schemas/swagger.config';
import { config, connectRedis } from '@/config';
import { AppDataSource, connectDatabase } from '@/config/database';
import { errorHandler, notFoundHandler } from '@/shared/middleware/error.middleware';
import { generalRateLimit } from '@/shared/middleware/rate-limit.middleware';
import { WebSocketService } from '@/shared/websocket/websocket.service';
import { logger } from '@/shared/utils/logger';

class Application {
  public app: express.Application;
  private webSocketService!: WebSocketService;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      })
    );

    // Secure CORS configuration
    const allowedOrigins = this.getAllowedOrigins();

    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps, Postman, etc.)
          if (!origin) return callback(null, true);

          // Check if the origin is in the allowed list
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          // In development, allow localhost on any port
          if (config.environment === 'development' && origin.includes('localhost')) {
            return callback(null, true);
          }

          // Reject the request
          logger.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
          return callback(new Error('Not allowed by CORS'), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
        maxAge: 86400, // 24 hours
      })
    );

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: config.upload.limit }));
    this.app.use(express.urlencoded({ extended: true, limit: config.upload.limit }));

    // Logging
    if (config.environment !== 'test') {
      this.app.use(
        morgan('combined', {
          stream: {
            write: (message: string) => logger.info(message.trim()),
          },
        })
      );
    }

    // Rate limiting
    this.app.use(generalRateLimit);
  }

  private getAllowedOrigins(): string[] {
    const origins: string[] = [];

    // Environment-specific origins
    switch (config.environment) {
      case 'production':
        origins.push(
          'https://amda.com',
          'https://www.amda.com',
          'https://app.amda.com',
          'https://admin.amda.com'
        );
        break;

      case 'staging':
        origins.push(
          'https://staging.amda.com',
          'https://staging-app.amda.com',
          'https://preview.amda.com'
        );
        break;

      case 'development':
        origins.push(
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:4200',
          'http://localhost:5173', // Vite
          'http://localhost:8080', // Vue CLI
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        );
        break;
    }

    // Add custom origins from environment variables
    const customOrigins =
      process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];
    origins.push(...customOrigins);

    // Remove duplicates and empty strings
    return [...new Set(origins)].filter(Boolean);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'AMDA Collection API is running',
        timestamp: new Date().toISOString(),
        environment: config.environment,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: 'connected', // You can add actual health checks here
          redis: 'connected',
        },
      });
    });

    // Simple ping endpoint
    this.app.get('/ping', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString(),
      });
    });

    // API root welcome endpoint
    this.app.get(config.apiPrefix, (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Welcome to AMDA backend server',
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use(config.apiPrefix, createApiRouter());
  }

  private initializeSwagger(): void {
    if (config.swagger.enabled) {
      // Get swagger info for logging
      const swaggerInfo = getSwaggerInfo();

      // Custom Swagger UI options
      const swaggerUiOptions = {
        explorer: true,
        customCss: `
          .swagger-ui .topbar { display: none }
          .swagger-ui .info .title { color: #1e40af; }
          .swagger-ui .info .description { color: #374151; }
        `,
        customSiteTitle: 'AMDA Collection API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          tryItOutEnabled: true,
          filter: true,
          displayOperationId: false,
          defaultModelsExpandDepth: 2,
          defaultModelExpandDepth: 2,
        },
      };

      // Swagger UI
      this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

      // Swagger JSON endpoint
      this.app.get('/api/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });

      // Swagger info endpoint (for debugging)
      this.app.get('/api/swagger-info', (req, res) => {
        res.json({
          success: true,
          message: 'Swagger configuration info',
          data: swaggerInfo,
        });
      });

      logger.info(`📚 Swagger documentation enabled for ${swaggerInfo.environment} environment`);
      logger.info(`🔗 Swagger server: ${swaggerInfo.server}`);
      logger.info(`📄 Total documented paths: ${swaggerInfo.totalPaths}`);
      logger.info(`🌐 Allowed CORS origins: ${this.getAllowedOrigins().join(', ')}`);
    } else {
      logger.info('📚 Swagger documentation disabled');
    }
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();

      if (config.environment === 'development' && config.database.autoGenerateMigrations) {
        await AppDataSource.synchronize();
        logger.info('Database synchronized with entities');
      } else if (config.database.runMigrationsOnStartup) {
        await AppDataSource.runMigrations();
        logger.info('Database migrations completed');
      }

      // Run migrations if configured
      if (config.database.runMigrationsOnStartup) {
        // const dataSource = await import('@/database/connection');
        await AppDataSource.runMigrations();
        logger.info('Database migrations completed');
      }

      // Connect to Redis
      await connectRedis();

      // Start server
      const server = this.app.listen(config.port, () => {
        logger.info(`🚀 AMDA Collection API started successfully!`);
        logger.info(`🌍 Environment: ${config.environment}`);
        logger.info(`📡 Server running on port: ${config.port}`);
        logger.info(`🔒 CORS Origins: ${this.getAllowedOrigins().length} allowed`);

        if (config.swagger.enabled) {
          const baseUrl =
            config.environment === 'production'
              ? 'https://api.amda.com'
              : `http://localhost:${config.port}`;

          logger.info(`📚 API Documentation: ${baseUrl}/api/docs`);
          logger.info(`🔍 Health Check: ${baseUrl}/health`);
          logger.info(`🎯 API Ping: ${baseUrl}/ping`);
          logger.info(`🎯 API Routes: ${baseUrl}${config.apiPrefix}`);
        }
      });
      // Initialize WebSocket server
      this.webSocketService = new WebSocketService(server);
      logger.info(`🔌 WebSocket server initialized`);
    } catch (error) {
      logger.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the applicationd
const app = new Application();

// (function (){
//   seedAdmin()
// })()
app.start();

export default app;
/ /   C I / C D   t e s t   0 9 / 2 3 / 2 0 2 5   2 3 : 1 3 : 2 4  
 