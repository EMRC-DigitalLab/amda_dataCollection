// src/api/swagger/swagger.config.ts
import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '@/config';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Dynamic server configuration based on environment
const getServerConfig = () => {
  const baseUrl =
    config.environment === 'production'
      ? 'https://api.amda.com'
      : `http://localhost:${config.port}`;

  return [
    {
      url: `${baseUrl}${config.apiPrefix}`,
      description: config.environment === 'production' ? 'Production server' : 'Development server',
    },
  ];
};

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AMDA Data Collection Tool API',
      version: '1.0.0',
      description: 'RESTful API for AMDA Mini Grid Collection Management System',
      contact: {
        name: 'EMRC Digital Systems unit (DSU)',
        email: 'Fortune.regis@energy-mrc.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: getServerConfig(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer {token}',
        },
      },
    },
    // security: [
    //   {
    //     bearerAuth: [],
    //   },
    // ],
  },
  apis: [], // Will be populated by merger
};

// Swagger Merger - Combines all module swagger files
class SwaggerMerger {
  private modulePaths: string[] = [];
  private components: any = {};
  private paths: any = {};

  constructor() {
    this.loadComponents(); // Load components FIRST
    this.loadApiRoutes();
    this.scanModules();
  }

  private loadApiRoutes(): void {
    // Load basic API routes (health, ping, etc.)
    const apiRoutesPath = path.join(__dirname, 'api-routes.yaml');

    if (fs.existsSync(apiRoutesPath)) {
      try {
        const apiRoutesContent = fs.readFileSync(apiRoutesPath, 'utf8');
        const apiRoutes = yaml.load(apiRoutesContent) as any;

        if (apiRoutes.paths) {
          this.paths = { ...this.paths, ...apiRoutes.paths };
        }

        console.log('✅ Loaded API routes for Swagger');
      } catch (error) {
        console.warn('⚠️  Error loading API routes:', error);
      }
    } else {
      console.warn('⚠️  API routes file not found, creating basic one');
      this.createBasicApiRoutes();
    }
  }

  private createBasicApiRoutes(): void {
    const basicRoutes = {
      paths: {
        '/ping': {
          get: {
            tags: ['System'],
            summary: 'API Health Check',
            description: 'Simple endpoint to check if the API is working',
            responses: {
              '200': {
                description: 'API is working correctly',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'API is working' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal server error',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: false },
                        message: {
                          type: 'string',
                          example: 'Internal server error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    this.paths = { ...this.paths, ...basicRoutes.paths };
  }

  private scanModules(): void {
    const modulesPath = path.join(__dirname, '../modules');
    if (!fs.existsSync(modulesPath)) {
      console.log('Modules directory not found, skipping module scanning');
      return;
    }

    const modules = fs.readdirSync(modulesPath, { withFileTypes: true });
    let moduleCount = 0;

    modules.forEach(module => {
      if (module.isDirectory()) {
        const moduleSwaggerPath = path.join(modulesPath, module.name);
        if (fs.existsSync(moduleSwaggerPath)) {
          const swaggerFiles = fs.readdirSync(moduleSwaggerPath);
          swaggerFiles.forEach(file => {
            if (file.endsWith('.yaml') || file.endsWith('.yml')) {
              const filePath = path.join(moduleSwaggerPath, file);

              try {
                const yamlContent = fs.readFileSync(filePath, 'utf8');
                const yamlData = yaml.load(yamlContent) as any;

                // Merge paths
                if (yamlData.paths) {
                  this.paths = { ...this.paths, ...yamlData.paths };
                  console.log(`Loaded paths from ${file}`);
                }

                // Merge ALL component types
                if (yamlData.components) {
                  ['schemas', 'responses', 'parameters', 'securitySchemes'].forEach(
                    componentType => {
                      if (yamlData.components[componentType]) {
                        this.components[componentType] = {
                          ...this.components[componentType],
                          ...yamlData.components[componentType],
                        };
                        console.log(`Loaded ${componentType} from ${file}`);
                      }
                    }
                  );
                }

                moduleCount++;
              } catch (error) {
                console.warn(`Error loading ${file}:`, error);
              }
            }
          });
        }
      }
    });

    console.log(`Found ${moduleCount} module swagger files`);
  }

  private loadComponents(): void {
    const componentsPath = path.join(__dirname, 'schemas');

    if (!fs.existsSync(componentsPath)) {
      fs.mkdirSync(componentsPath, { recursive: true });
      this.createDefaultComponents();
      return;
    }

    try {
      const componentsFile = path.join(componentsPath, 'components.yaml');
      if (fs.existsSync(componentsFile)) {
        const componentsContent = fs.readFileSync(componentsFile, 'utf8');
        const loadedComponents = yaml.load(componentsContent) as any;

        // Properly structure the components
        this.components = {
          schemas: loadedComponents.components?.schemas || {},
          securitySchemes: loadedComponents.components?.securitySchemes || {},
          parameters: loadedComponents.components?.parameters || {},
          responses: loadedComponents.components?.responses || {},
        };

        console.log('✅ Loaded Swagger components');
        console.log(`📦 Loaded ${Object.keys(this.components.schemas).length} schemas`);
        console.log(`📦 Loaded ${Object.keys(this.components.responses).length} responses`);
      } else {
        this.createDefaultComponents();
      }
    } catch (error) {
      console.warn('⚠️  Error loading components:', error);
      this.createDefaultComponents();
    }
  }

  private createDefaultComponents(): void {
    const defaultComponents = {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { description: 'Response data' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'API is working' },
            timestamp: { type: 'string', format: 'date-time' },
            environment: { type: 'string', example: 'development' },
            version: { type: 'string', example: '1.0.0' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Internal server error' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Validation failed' },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' },
                        value: {},
                      },
                    },
                  },
                },
              },
            },
          },
        },
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Unauthorized' },
                  error: { type: 'string', example: 'Invalid or missing token' },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Forbidden' },
                  error: { type: 'string', example: 'Insufficient permissions' },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Resource not found' },
                  error: { type: 'string', example: 'The requested resource could not be found' },
                },
              },
            },
          },
        },
      },
    };

    const componentsPath = path.join(__dirname, 'schemas', 'components.yaml');
    const yamlContent = {
      components: defaultComponents,
    };
    fs.writeFileSync(componentsPath, yaml.dump(yamlContent));
    this.components = defaultComponents;
    console.log('Created default Swagger components');
  }

  public generateSpec(): object {
    // Set APIs for JSDoc scanning
    swaggerOptions.apis = this.modulePaths;

    // Generate base spec
    const baseSpec = swaggerJSDoc(swaggerOptions);

    // Create final spec with proper components merging
    const finalSpec: any = {
      ...baseSpec,
      components: {
        // Start with base components from swaggerOptions
        ...(baseSpec as any).components,
        // Merge with loaded components (this will override base if conflicts)
        schemas: {
          ...((baseSpec as any).components?.schemas || {}),
          ...this.components.schemas,
        },
        securitySchemes: {
          ...((baseSpec as any).components?.securitySchemes || {}),
          ...this.components.securitySchemes,
        },
        parameters: {
          ...((baseSpec as any).components?.parameters || {}),
          ...this.components.parameters,
        },
        responses: {
          ...((baseSpec as any).components?.responses || {}),
          ...this.components.responses,
        },
      },
      paths: {
        ...((baseSpec as any).paths || {}),
        ...this.paths,
      },
    };

    // Add environment info
    if (finalSpec.info) {
      finalSpec.info.description += ` (Environment: ${config.environment})`;
    }

    console.log(`🎯 Generated Swagger spec for ${config.environment} environment`);
    console.log(`📄 Total paths: ${Object.keys(finalSpec.paths || {}).length}`);
    console.log(`📦 Total schemas: ${Object.keys(finalSpec.components?.schemas || {}).length}`);
    console.log(`📦 Total responses: ${Object.keys(finalSpec.components?.responses || {}).length}`);

    return finalSpec;
  }

  public getModulePaths(): string[] {
    return this.modulePaths;
  }

  public getLoadedPaths(): any {
    return this.paths;
  }

  public getLoadedComponents(): any {
    return this.components;
  }
}

export const swaggerMerger = new SwaggerMerger();
export const swaggerSpec = swaggerMerger.generateSpec();

// Export for debugging
export const getSwaggerInfo = () => {
  return {
    environment: config.environment,
    server:
      config.environment === 'production'
        ? 'https://api.amda.com'
        : `http://localhost:${config.port}`,
    totalPaths: Object.keys(swaggerMerger.getLoadedPaths()).length,
    modulePaths: swaggerMerger.getModulePaths(),
    loadedComponents: swaggerMerger.getLoadedComponents(),
  };
};
