// index.ts - Main entry point for data import pipeline

import { DataSource } from 'typeorm';
import { AppDataSource } from '../../src/config';
import { DataImportPipeline } from './pipeline';
import { PipelineConfig } from './types';
import { logger } from './utils/logger';

/**
 * Main function to run the data import pipeline
 */
export async function runDataImport(config: PipelineConfig): Promise<void> {
  let dataSource: DataSource | null = null;

  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    dataSource = await AppDataSource.initialize();
    logger.success('Database connected successfully');

    // Get or create system admin for form creation
    const adminId = await getSystemAdminId(dataSource);
    logger.info(`Using admin ID: ${adminId}`);

    // Run pipeline
    const pipeline = new DataImportPipeline(dataSource, adminId);
    const progress = await pipeline.run(config);

    // Log final status
    if (progress.errors.length === 0) {
      logger.success('✓ Pipeline completed successfully with no errors!');
    } else {
      logger.warn(`✓ Pipeline completed with ${progress.errors.length} errors`);
    }
  } catch (error: any) {
    logger.error('Pipeline execution failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    // Clean up
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      logger.info('Database connection closed');
    }
  }
}

/**
 * Get system admin ID for form creation
 * If no admin exists, create a default system admin
 */
async function getSystemAdminId(dataSource: DataSource): Promise<string> {
  const userRepository = dataSource.getRepository('User');

  // Try to find existing admin
  const admin = await userRepository.findOne({
    where: { role: 'admin' },
  });

  if (admin) {
    return admin.id;
  }

  // Create system admin if none exists
  logger.warn('No admin found, creating system admin...');

  const systemAdmin = userRepository.create({
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@system.com',
    phoneNumber: '+1-000-000-0000',
    password: 'SystemAdmin123!', // Will be hashed by entity
    role: 'admin',
    status: 'active',
    country: 'System',
  });

  const savedAdmin = await userRepository.save(systemAdmin);
  logger.success(`System admin created: ${savedAdmin.id}`);

  return savedAdmin.id;
}

/**
 * Export for use in scripts
 */
export { DataImportPipeline } from './pipeline';
export * from './types';
