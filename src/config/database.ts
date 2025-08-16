// src/config/database.ts
import { DataSource } from 'typeorm';
import { config } from './environment';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  subscribers: [__dirname + '/../database/subscribers/*{.ts,.js}'],
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  extra: {
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  },
});

// Database connection helper
export const connectDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected successfully');

      // Log connection info (without sensitive data)
      console.log(
        `📊 Connected to: ${config.database.host}:${config.database.port}/${config.database.database}`
      );
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};
