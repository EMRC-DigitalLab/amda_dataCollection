// run-import.ts - CLI script to run the data import pipeline

import * as path from 'path';
import * as fs from 'fs';
import { runDataImport } from './data-import';
import { PipelineConfig } from './data-import/types';

/**
 * Main CLI execution
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: ts-node run-import.ts <excel-file-path> [year] [--dry-run]');
    console.error('Example: ts-node run-import.ts ./data/Member_Data_2024.xlsx 2024');
    process.exit(1);
  }

  const filePath = args[0];
  const year = args[1] ? parseInt(args[1], 10) : undefined;
  const dryRun = args.includes('--dry-run');

  // Validate file exists
  //   const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // Build configuration
  const config: PipelineConfig = {
    filePath: path.resolve(filePath),
    year,
    dryRun,
    logLevel: 'DEBUG',
  };

  console.log('\n' + '='.repeat(80));
  console.log('DATA IMPORT PIPELINE');
  console.log('='.repeat(80));
  console.log(`File: ${config.filePath}`);
  console.log(`Year: ${config.year || 'Auto-detect'}`);
  console.log(`Dry Run: ${config.dryRun ? 'Yes' : 'No'}`);
  console.log('='.repeat(80) + '\n');

  try {
    await runDataImport(config);
    console.log('\n✓ Import completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Import failed!\n');
    console.error(error);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
