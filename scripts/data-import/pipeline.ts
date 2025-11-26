// pipeline.ts - Main pipeline orchestrator

import { DataSource } from 'typeorm';
import { parseExcelFile } from './parsers/excel-parser';
import { MemberProcessor } from './processors/member-processor';
import { FormTypeProcessor } from './processors/form-type-processor';
import { FormProcessor } from './processors/form-processor';
import { SiteProcessor } from './processors/site-processor';
import { generateSlug } from './utils/slug-generator';
import { SubmissionProcessor } from './processors/submission-processor';
import { PipelineConfig, PipelineProgress } from './types';
import { logger } from './utils/logger';

export class DataImportPipeline {
  private dataSource: DataSource;
  private adminId: string;
  private progress: PipelineProgress;

  constructor(dataSource: DataSource, adminId: string) {
    this.dataSource = dataSource;
    this.adminId = adminId;
    this.progress = this.initializeProgress();
  }

  /**
   * Run the complete data import pipeline
   */
  async run(config: PipelineConfig): Promise<PipelineProgress> {
    const startTime = Date.now();

    logger.section('DATA IMPORT PIPELINE STARTED');
    logger.info('Configuration:', {
      filePath: config.filePath,
      year: config.year,
      dryRun: config.dryRun || false,
    });

    try {
      // STEP 1: Parse Excel file
      const excelData = await parseExcelFile(config.filePath);
      const year = config.year || excelData.year;

      // STEP 2: Process Member
      const memberProcessor = new MemberProcessor(this.dataSource);
      const member = await memberProcessor.processMember(excelData.memberName);
      this.progress.membersCreated = 1;

      // STEP 3: Process Form Types
      const formTypeProcessor = new FormTypeProcessor(this.dataSource);
      const formTypeMap = await formTypeProcessor.processFormTypes(excelData.instructions, year);
      this.progress.formTypesCreated = formTypeMap.size;

      // If no form types found from Instructions, create them from sheet names
      if (formTypeMap.size === 0) {
        logger.warn('No form types found in Instructions sheet, creating from data sheets...');

        for (const dataSheet of excelData.dataSheets) {
          const formType = await formTypeProcessor.processFormType(
            dataSheet.formTypeName,
            `Data collection for ${dataSheet.formTypeName}`,
            generateSlug(dataSheet.formTypeName),
            year
          );
          formTypeMap.set(dataSheet.formTypeName, formType);
        }

        this.progress.formTypesCreated = formTypeMap.size;
        logger.success(`Created ${formTypeMap.size} form types from sheet names`);
      }

      // STEP 4: Process Each Data Sheet
      const formProcessor = new FormProcessor(this.dataSource, this.adminId);
      const siteProcessor = new SiteProcessor(this.dataSource);
      const submissionProcessor = new SubmissionProcessor(this.dataSource);

      for (const dataSheet of excelData.dataSheets) {
        logger.section(`PROCESSING SHEET: ${dataSheet.sheetName}`);

        try {
          // Get form type for this sheet
          const formType = formTypeMap.get(dataSheet.formTypeName);
          if (!formType) {
            logger.error(`Form type not found for sheet: ${dataSheet.sheetName}`);
            this.progress.errors.push({
              step: 'Form Type Lookup',
              context: dataSheet.sheetName,
              message: 'Form type not found',
              timestamp: new Date(),
            });
            continue;
          }

          // A. Create and publish form
          const form = await formProcessor.processForm(dataSheet, formType);
          this.progress.formsCreated++;
          this.progress.formsPublished++;

          // B. Build KPI to slug mapping for dynamic site field extraction
          const kpiToSlugMap = SiteProcessor.buildKpiToSlugMap(dataSheet);

          // C. Process sites and submissions
          logger.info(`Processing ${dataSheet.dataRows.length} sites...`);

          for (const siteRow of dataSheet.dataRows) {
            try {
              // Create/update site
              const site = await siteProcessor.processSite(siteRow, member, kpiToSlugMap);
              this.progress.sitesCreated++;

              // Create/update submission
              await submissionProcessor.processSubmission(form, site, member, siteRow);
              this.progress.submissionsCreated++;
            } catch (error: any) {
              this.progress.errors.push({
                step: 'Site/Submission Processing',
                context: `${dataSheet.sheetName} - ${siteRow.siteName}`,
                message: error.message,
                timestamp: new Date(),
              });
            }
          }

          logger.success(`Sheet processing complete: ${dataSheet.sheetName}`);
          logger.separator();
        } catch (error: any) {
          this.progress.errors.push({
            step: 'Sheet Processing',
            context: dataSheet.sheetName,
            message: error.message,
            timestamp: new Date(),
          });
          logger.error(`Failed to process sheet: ${dataSheet.sheetName}`, {
            error: error.message,
          });
        }
      }

      // Generate final report
      const duration = Date.now() - startTime;
      this.logFinalReport(duration);

      return this.progress;
    } catch (error: any) {
      logger.error('Pipeline execution failed', {
        error: error.message,
        stack: error.stack,
      });

      this.progress.errors.push({
        step: 'Pipeline Execution',
        context: 'General',
        message: error.message,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Initialize progress tracking
   */
  private initializeProgress(): PipelineProgress {
    return {
      membersCreated: 0,
      membersUpdated: 0,
      formTypesCreated: 0,
      formTypesExisting: 0,
      formsCreated: 0,
      formsPublished: 0,
      sitesCreated: 0,
      sitesUpdated: 0,
      submissionsCreated: 0,
      submissionsUpdated: 0,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Log final report
   */
  private logFinalReport(duration: number): void {
    logger.section('PIPELINE EXECUTION COMPLETE');

    logger.success('Summary:', {
      duration: `${(duration / 1000).toFixed(2)}s`,
      membersCreated: this.progress.membersCreated,
      formTypesCreated: this.progress.formTypesCreated,
      formsCreated: this.progress.formsCreated,
      formsPublished: this.progress.formsPublished,
      sitesCreated: this.progress.sitesCreated,
      submissionsCreated: this.progress.submissionsCreated,
      errors: this.progress.errors.length,
    });

    if (this.progress.errors.length > 0) {
      logger.warn(`Encountered ${this.progress.errors.length} errors during pipeline execution`);
      this.progress.errors.forEach((error, index) => {
        logger.error(`Error ${index + 1}:`, {
          step: error.step,
          context: error.context,
          message: error.message,
        });
      });
    }

    logger.separator();
  }
}
