// src/database/connection.ts
import { AppDataSource } from '@/config/database';
import { logger } from '@/shared/utils/logger';

export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ Database connection established successfully');
    }
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('🔌 Database connection closed');
    }
  } catch (error) {
    logger.error('❌ Error closing database connection:', error);
  }
};
