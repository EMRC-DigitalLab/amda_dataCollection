// @ts-nocheck

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { ExportRepository } from '../../../database/repositories/forms/export.repository';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { ExportController } from '../controllers/export.controller';
import { ExportService } from '../services/export.service';
import { FormNotificationService } from '../services/form-notification.service';
import { FormService } from '../services/form.service';


export function createExportRoutes(dataSource: DataSource): Router {
  const router = Router();
  
  const exportRepository = new ExportRepository(dataSource);
    const formRepository = new FormRepository(dataSource);
  
    const webSocketService = (global as any).webSocketService;
  
    const formNotificationService = new FormNotificationService(webSocketService);
    const formService = new FormService(formRepository, formNotificationService);
  const exportService = new ExportService(exportRepository, formService);
  const exportController = new ExportController(exportService);

  /**
   * General Export Routes
   */

  // POST /api/exports - Export data based on criteria
  router.post(
    '/',
    authMiddleware,
    (req, res) => exportController.exportSubmissions(req, res)
  );

  // POST /api/exports/bulk - Bulk export multiple data sets
  router.post(
    '/bulk',
    authMiddleware,
    
    (req, res) => exportController.bulkExport(req, res)
  );

  // GET /api/exports/preview - Get preview of data to be exported
  router.get(
    '/preview',
    authMiddleware,
   
    (req, res) => exportController.getExportPreview(req, res)
  );

  // GET /api/exports/summary - Get summary of export data
  router.get(
    '/summary',
    authMiddleware,
   
    (req, res) => exportController.getExportSummary(req, res)
  );

  // GET /api/exports/types - Get available export types
  router.get(
    '/types',
    authMiddleware,
    (req, res) => exportController.getExportTypes(req, res)
  );

  // GET /api/exports/formats - Get available export formats
  router.get(
    '/formats',
    authMiddleware,
    (req, res) => exportController.getExportFormats(req, res)
  );

  /**
   * File Management Routes
   */

  // GET /api/exports/files - List all export files
  router.get(
    '/files',
    authMiddleware,
    
    (req, res) => exportController.listExportFiles(req, res)
  );

  // GET /api/exports/files/:fileName/download - Download export file
  router.get(
    '/files/:fileName/download',
    authMiddleware,
   
    (req, res) => exportController.downloadExportFile(req, res)
  );

  // DELETE /api/exports/files/:fileName - Delete export file
  router.delete(
    '/files/:fileName',
    authMiddleware,
    
    (req, res) => exportController.deleteExportFile(req, res)
  );

  /**
   * Form Type Export Routes
   */

  // GET /api/exports/form-types/:formTypeId - Export submissions for specific form type
  router.get(
    '/form-types/:formTypeId',
    authMiddleware,
   
    (req, res) => exportController.exportFormTypeSubmissions(req, res)
  );

  // GET /api/exports/form-types/:formTypeId/year/:year - Export submissions for specific form type and year
  router.get(
    '/form-types/:formTypeId/year/:year',
    authMiddleware,
   
    (req, res) => {
      req.query.year = req.params.year;
      exportController.exportFormTypeSubmissions(req, res);
    }
  );

  /**
   * Member Export Routes
   */

  // GET /api/exports/members/:memberId - Export all submissions by member
  router.get(
    '/members/:memberId',
    authMiddleware,
   
    (req, res) => exportController.exportMemberSubmissions(req, res)
  );

  // GET /api/exports/members/:memberId/year/:year - Export member submissions for specific year
  router.get(
    '/members/:memberId/year/:year',
    authMiddleware,
   
    (req, res) => {
      req.query.year = req.params.year;
      exportController.exportMemberSubmissions(req, res);
    }
  );

  // GET /api/exports/members/:memberId/form-types/:formTypeId - Export member submissions for specific form type
  router.get(
    '/members/:memberId/form-types/:formTypeId',
    authMiddleware,
   
    (req, res) => {
      req.query.formTypeId = req.params.formTypeId;
      exportController.exportMemberSubmissions(req, res);
    }
  );

  /**
   * Site Export Routes
   */

  // GET /api/exports/sites/:siteId - Export all submissions by site
  router.get(
    '/sites/:siteId',
    authMiddleware,
   
    (req, res) => exportController.exportSiteSubmissions(req, res)
  );

  // GET /api/exports/sites/:siteId/year/:year - Export site submissions for specific year
  router.get(
    '/sites/:siteId/year/:year',
    authMiddleware,
   
    (req, res) => {
      req.query.year = req.params.year;
      exportController.exportSiteSubmissions(req, res);
    }
  );

  // GET /api/exports/sites/:siteId/form-types/:formTypeId - Export site submissions for specific form type
  router.get(
    '/sites/:siteId/form-types/:formTypeId',
    authMiddleware,
   
    (req, res) => {
      req.query.formTypeId = req.params.formTypeId;
      exportController.exportSiteSubmissions(req, res);
    }
  );

  /**
   * Global Export Routes
   */

  // GET /api/exports/all - Export all submissions with optional filters
  router.get(
    '/all',
    authMiddleware,
    
    (req, res) => exportController.exportAllSubmissions(req, res)
  );

  // GET /api/exports/all/year/:year - Export all submissions for specific year
  router.get(
    '/all/year/:year',
    authMiddleware,
    
    (req, res) => {
      req.query.year = req.params.year;
      exportController.exportAllSubmissions(req, res);
    }
  );

  // GET /api/exports/all/form-types/:formTypeId - Export all submissions for specific form type
  router.get(
    '/all/form-types/:formTypeId',
    authMiddleware,
    
    (req, res) => {
      req.query.formTypeId = req.params.formTypeId;
      exportController.exportAllSubmissions(req, res);
    }
  );

  /**
   * Custom Filter Routes
   */

  // POST /api/exports/custom - Export with custom filters
  router.post(
    '/custom',
    authMiddleware,
   
    (req, res) => {
      req.body.exportType = 'CUSTOM_FILTERED';
      exportController.exportSubmissions(req, res);
    }
  );

  return router;
}