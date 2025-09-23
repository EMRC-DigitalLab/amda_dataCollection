# AMDA Mini Grid Collection Tool Backend API

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-lightgrey.svg)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Operations](#database-operations)
- [Testing](#testing)
- [Docker Setup](#docker-setup)
- [Scripts Reference](#scripts-reference)
- [Code Quality & Development](#code-quality--development)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The AMDA Mini Grid Collection Tool Backend API is a proprietary RESTful API built for AMDA's internal mini-grid energy collection systems. It provides a robust foundation with authentication, security, and extensible architecture for future business module development.

## ✨ Features

- **🔐 Authentication & Authorization**: JWT-based authentication with role-based access control
- **🏗️ Modular Architecture**: Clean, extensible architecture ready for business module development
- **🔄 Real-time Ready**: Built-in support for real-time updates and background jobs
- **📈 Rate Limiting**: Advanced rate limiting for API protection
- **🐳 Docker Ready**: Full containerization with Docker Compose
- **📚 API Documentation**: Interactive Swagger/OpenAPI documentation
- **🔍 Health Monitoring**: Built-in health checks and monitoring
- **🔒 Enterprise Security**: Helmet.js, CORS, input validation, and sanitization
- **📊 Logging & Monitoring**: Comprehensive logging with Winston
- **🚀 Production Ready**: Optimized for production deployment with proper CI/CD setup

## 🛠 Tech Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.2+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 15+ with TypeORM
- **Caching**: Redis 7+
- **Queue**: Bull Queue for background jobs

### Development Tools
- **Testing**: Jest with Supertest
- **Linting**: ESLint with TypeScript parser
- **Code Formatting**: Prettier
- **Documentation**: Swagger/OpenAPI 3.0
- **Process Management**: Nodemon for development
- **Containerization**: Docker & Docker Compose

### Security & Monitoring
- **Authentication**: JWT with bcryptjs
- **Security**: Helmet.js, CORS, Rate Limiting
- **Logging**: Winston with structured logging
- **Validation**: Joi & class-validator
- **Email**: Nodemailer integration

## 📁 Project Structure

```
amda-collection-backend/
├── docker/                     # Docker configuration
│   ├── docker-compose.dev.yml  # Development compose file
│   ├── docker-compose.yml      # Production compose file
│   ├── Dockerfile.dev          # Development Dockerfile
│   ├── Dockerfile              # Production Dockerfile
│   └── nginx.conf              # Nginx configuration
├── docs/                       # Documentation
│   ├── api/                    # API documentation
│   ├── deployment/             # Deployment guides
│   └── development/            # Development guides
├── scripts/                    # Utility scripts
│   └── generate-swagger.ts     # Swagger generation script
├── src/                        # Source code
│   ├── api/                    # API layer
│   │   ├── routes/             # Route definitions
│   │   └── swagger/            # Swagger configuration
│   ├── config/                 # Configuration files
│   │   ├── database.ts         # Database configuration
│   │   ├── environment.ts      # Environment variables
│   │   ├── index.ts           # Config exports
│   │   └── redis.ts           # Redis configuration
│   ├── database/              # Database layer
│   │   ├── entities/          # TypeORM entities
│   │   ├── migrations/        # Database migrations
│   │   ├── repositories/      # Custom repositories
│   │   ├── seeds/            # Database seeders
│   │   └── connection.ts     # Database connection
│   ├── events/               # Event handling
│   │   ├── emitters/         # Event emitters
│   │   └── handlers/         # Event handlers
│   ├── jobs/                 # Background jobs
│   │   ├── collections/      # Collection jobs
│   │   ├── notifications/    # Notification jobs
│   │   ├── payments/         # Payment jobs
│   │   └── queue/           # Queue configuration
│   ├── modules/             # Business logic modules
│   │   └── auth/            # Authentication module (implemented)
│   │   └── [future-modules] # Additional modules (billing, customers, etc.) - placeholders for future development
│   ├── shared/              # Shared utilities
│   │   ├── constants/       # Application constants
│   │   ├── decorators/      # Custom decorators
│   │   ├── middleware/      # Express middleware
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── main.ts             # Application entry point
├── tests/                  # Test suites
│   ├── e2e/               # End-to-end tests
│   ├── fixtures/          # Test fixtures
│   ├── integration/       # Integration tests
│   ├── setup/            # Test setup
│   └── unit/             # Unit tests
├── .env.development       # Development environment
├── .env.production        # Production environment
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── ormconfig.ts          # TypeORM configuration
└── README.md            # This file
```

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Docker**: Version 20.10+ (for containerized development)
- **Docker Compose**: Version 2.0+
- **PostgreSQL**: Version 15+ (if running locally)
- **Redis**: Version 7+ (if running locally)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/amda-internal/amda-collection-backend.git
cd amda-collection-backend
```

*Note: This is a proprietary AMDA project. Access is restricted to authorized team members only.*

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
# Copy environment templates
cp .env.development.template .env.development
cp .env.production.template .env.production

# Edit the environment files with your configuration
```

## ⚙️ Environment Setup

### Development Environment (`.env.development`)
```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=amda_collection_dev
DATABASE_USERNAME=amda_user
DATABASE_PASSWORD=amda_password
DATABASE_SYNC=true
DATABASE_LOGGING=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@amda.com

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:4200
FRONTEND_URL=http://localhost:3000

# Swagger Configuration
SWAGGER_ENABLED=true
SWAGGER_PATH=/api/docs

# Upload Configuration
UPLOAD_MAX_SIZE=10mb
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
```

### Production Environment (`.env.production`)
```env
# Server Configuration
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# Database Configuration
DATABASE_HOST=your-production-db-host
DATABASE_PORT=5432
DATABASE_NAME=amda_collection_prod
DATABASE_USERNAME=amda_user
DATABASE_PASSWORD=your-secure-password
DATABASE_SYNC=false
DATABASE_LOGGING=false
DATABASE_SSL=true

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Configuration (Use strong, unique secrets in production)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secure-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@amda.com

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=50

# CORS Configuration
ALLOWED_ORIGINS=https://amda.com,https://www.amda.com,https://app.amda.com
FRONTEND_URL=https://app.amda.com

# Swagger Configuration
SWAGGER_ENABLED=false
SWAGGER_PATH=/api/docs

# Upload Configuration
UPLOAD_MAX_SIZE=5mb
UPLOAD_PATH=/app/uploads

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

## 🏃‍♂️ Running the Application

### Development Mode (Local)
```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (if not using Docker)
# Make sure they're running on default ports

# Run database migrations
npm run migration:run

# Seed the database (optional)
npm run seed

# Start development server
npm run start:dev
```

### Development Mode (Docker)
```bash
# Start all services with hot reload
npm run docker:dev

# View logs
npm run docker:dev:logs

# Stop services
npm run docker:dev:down
```

### Production Mode (Docker)
```bash
# Build and start production services
npm run docker:prod

# Stop production services
npm run docker:prod:down
```

### Debug Mode
```bash
# Start with Node.js inspector
npm run start:debug

# Then attach your debugger to localhost:9229
```

## 📚 API Documentation

### Swagger UI
Once the application is running, you can access the interactive API documentation:

- **Development**: http://localhost:3000/api/docs
- **Production**: https://your-domain.com/api/docs (if enabled)

### API Endpoints Overview

#### System Endpoints
- `GET /health` - Application health check
- `GET /ping` - Simple API ping
- `GET /api/docs` - Swagger documentation
- `GET /api/docs.json` - OpenAPI specification

#### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

*Note: Additional business modules (customers, billing, meters, payments, reports) are planned for future development and currently exist as placeholder directories.*

## 🗄️ Database Operations

### Migrations
```bash
# Generate a new migration
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Database Seeding
```bash
# Seed the database with sample data
npm run seed
```

### TypeORM CLI Commands
```bash
# Show migration status
npx typeorm migration:show

# Create empty migration
npx typeorm migration:create -n MigrationName

# Drop database schema
npx typeorm schema:drop
```

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e
```

### Test Structure
```
tests/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for modules
├── e2e/              # End-to-end API tests
├── fixtures/         # Test data and fixtures
└── setup/           # Test configuration and setup
```

## 🐳 Docker Setup

### Development with Docker
```bash
# Start development environment
docker-compose -f docker/docker-compose.dev.yml up --build

# Stop and remove containers
docker-compose -f docker/docker-compose.dev.yml down

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f amda-api-dev

# Execute commands in container
docker-compose -f docker/docker-compose.dev.yml exec amda-api-dev npm run migration:run
```

### Production with Docker
```bash
# Build and start production
docker-compose -f docker/docker-compose.yml up --build -d

# Check status
docker-compose -f docker/docker-compose.yml ps

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop production
docker-compose -f docker/docker-compose.yml down
```

### Docker Services

#### Development Services
- **amda-api-dev**: Main API application with hot reload
- **amda-postgres-dev**: PostgreSQL database
- **amda-redis-dev**: Redis cache
- **amda-mailhog**: Email testing service

#### Production Services
- **amda-api**: Optimized production API
- **postgres**: Production PostgreSQL
- **redis**: Production Redis
- **nginx**: Reverse proxy and load balancer

## 📜 Scripts Reference

### Development Scripts
```bash
npm run start:dev      # Start development server with hot reload
npm run start:debug    # Start with debugger attached
npm run build          # Build TypeScript to JavaScript
npm run start          # Start production build
```

### Docker Scripts
```bash
npm run docker:dev            # Start development containers
npm run docker:dev:down       # Stop development containers
npm run docker:dev:restart    # Restart development containers
npm run docker:dev:logs       # View development logs
npm run docker:prod           # Start production containers
npm run docker:prod:down      # Stop production containers
npm run docker:clean          # Remove all containers and volumes
npm run docker:build          # Build production Docker image
```

### Database Scripts
```bash
npm run migration:generate    # Generate new migration
npm run migration:run         # Run pending migrations
npm run migration:revert      # Revert last migration
npm run seed                  # Seed database with sample data
```

### Testing Scripts
```bash
npm test                      # Run all tests
npm run test:watch            # Run tests in watch mode
npm run test:e2e              # Run end-to-end tests
```

### Utility Scripts
```bash
npm run swagger:generate      # Generate Swagger documentation
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcryptjs
- Secure password policies

### API Security
- Rate limiting with express-rate-limit
- CORS protection with whitelist
- Helmet.js for security headers
- Input validation and sanitization
- SQL injection prevention with TypeORM

### Data Protection
- Environment variable protection
- Secure cookie handling
- HTTPS enforcement in production
- Data encryption for sensitive fields

## 📊 Monitoring & Logging

### Health Checks
- Application health endpoint: `/health`
- Database connectivity check
- Redis connectivity check
- Service dependency monitoring

### Logging
- Structured logging with Winston
- Multiple log levels (error, warn, info, debug)
- File and console output
- Request/response logging with Morgan

### Performance
- Response time monitoring
- Memory usage tracking
- Database query optimization
- Caching strategies with Redis

## 🚀 Deployment

### Environment Setup
1. Set up production environment variables
2. Configure SSL certificates
3. Set up monitoring and alerting
4. Configure backup strategies

### Production Deployment
```bash
# Build and deploy with Docker
npm run docker:prod

# Or build for manual deployment
npm run build
npm start
```

### Health Monitoring
- Monitor `/health` endpoint
- Set up alerting for service failures
- Monitor database and Redis connectivity
- Track API response times and error rates

## 🧹 Code Quality & Development

### Code Formatting with Prettier

This project uses **Prettier** for consistent code formatting across the team.

#### Setup Prettier in Your Editor

**VS Code (Recommended):**
1. Install the Prettier extension: `esbenp.prettier-vscode`
2. Open VS Code settings (Ctrl/Cmd + ,)
3. Search for "format on save" and enable it
4. Set Prettier as default formatter

**Manual Setup:**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

#### Prettier Commands

```bash
# Format all files
npm run format

# Check if files are formatted (CI/CD)
npm run format:check

# Format specific file
npx prettier --write src/main.ts
```

#### Prettier Configuration

The project uses these Prettier settings (`.prettierrc`):
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Linting with ESLint

**ESLint** is configured with TypeScript support for code quality and consistency.

#### ESLint Commands

```bash
# Check for linting errors
npm run lint:check

# Fix linting errors automatically
npm run lint

# Lint specific file
npx eslint src/main.ts --fix
```

#### ESLint Rules

Key rules enforced:
- **No unused variables** (except prefixed with `_`)
- **TypeScript best practices**
- **Consistent code style**
- **No explicit `any` types** (disabled for flexibility)

### Git Hooks with Husky

**Husky** ensures code quality before commits and pushes.

#### Pre-commit Hook

Automatically runs before each commit:
```bash
# What happens on git commit:
1. Prettier formats staged files
2. ESLint fixes linting issues
3. Tests run to ensure nothing breaks
```

#### Setup Git Hooks

```bash
# Initialize husky (already done in setup)
npx husky init

# Manually run pre-commit checks
npm run precommit
```

### Development Workflow

#### Daily Development Commands

```bash
# Start development with auto-restart
npm run start:dev

# Format and lint before committing
npm run precommit

# Run tests
npm test

# Build for production
npm run build
```

#### Code Quality Checklist

Before committing code, ensure:
- ✅ Code is formatted with Prettier
- ✅ No ESLint errors
- ✅ All tests pass
- ✅ TypeScript compiles without errors
- ✅ Environment variables are properly set

#### File Naming Conventions

```
src/
├── modules/
│   └── auth/
│       ├── controllers/
│       │   └── auth.controller.ts     # PascalCase + .controller
│       ├── services/
│       │   └── auth.service.ts        # PascalCase + .service
│       ├── dtos/
│       │   └── login.dto.ts           # kebab-case + .dto
│       └── interfaces/
│           └── auth.interface.ts      # kebab-case + .interface
```

#### Code Style Guidelines

**TypeScript:**
```typescript
// ✅ Good - Use interfaces for object shapes
interface UserData {
  id: string;
  email: string;
  createdAt: Date;
}

// ✅ Good - Use meaningful variable names
const authenticatedUser = await authService.validateToken(token);

// ✅ Good - Use async/await instead of promises
async function getUserData(id: string): Promise<UserData> {
  try {
    return await userRepository.findById(id);
  } catch (error) {
    logger.error('Failed to get user data:', error);
    throw new AppError('User not found', 404);
  }
}
```

**Express Routes:**
```typescript
// ✅ Good - Proper error handling and response format
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
```

### IDE Configuration

#### Recommended VS Code Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

#### VS Code Workspace Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

### Troubleshooting

#### Common Issues

**Prettier not formatting:**
```bash
# Check Prettier config
npx prettier --check src/

# Fix formatting
npm run format
```

**ESLint errors:**
```bash
# Check specific errors
npm run lint:check

# Auto-fix issues
npm run lint
```

**Husky hooks not working:**
```bash
# Reinstall husky
npm run prepare
npx husky init
```

**TypeScript compilation errors:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Build project
npm run build
```

## 🤝 Contributing

### Development Workflow
1. Get access to the private repository (contact development team)
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request for internal review

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write unit tests for new features
- Update documentation for API changes
- Follow conventional commit messages

### Code Review Process
- All changes require code review
- Automated tests must pass
- Security review for authentication changes
- Performance review for database changes

## 📄 License

This project is proprietary software owned by AMDA. All rights reserved. Unauthorized copying, distribution, or modification is strictly prohibited.

**© 2025 AMDA - Energy Management Research Centre (EMRC)**

## 🆘 Support

### Getting Help
- Contact the internal development team for support
- Create internal tickets for bugs or feature requests
- Check internal documentation and knowledge base
- Reach out via internal communication channels

- npx prettier --write scripts/seed-admin.ts --end-of-line lf    command for widows to linux formatting
- docker-compose -f docker/docker-compose.dev.yml --profile seed up amda-seed-admin

### Useful Resources
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)
- [TypeORM Documentation](https://typeorm.io/)
- [Docker Documentation](https://docs.docker.com/)

### Development Team
- **EMRC Digital Systems Unit (DSU)**
- **Email**: Fortune.regis@energy-mrc.com

---

**Made with ❤️ by the EMRC Digital System Unit (DSU)**# #   D e p l o y m e n t 
 
 S e e   [ D E P L O Y M E N T . m d ] ( D E P L O Y M E N T . m d )   f o r   C I / C D   s e t u p   i n s t r u c t i o n s . 
 
 
