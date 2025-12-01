import { Router } from 'express';
import { DataSource } from 'typeorm';
import { ExportRepository } from '../../../database/repositories/forms/export.repository';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { ExportController } from '../controllers/export.controller';
import { FormNotificationService } from '../services/form-notification.service';
import { FormService } from '../services/form.service';

export function createExportRoutes(dataSource: DataSource): Router {
  const router = Router();

  const exportRepository = new ExportRepository(dataSource);
  const formRepository = new FormRepository(dataSource);

  const webSocketService = (global as any).webSocketService;

  const formNotificationService = new FormNotificationService(webSocketService);
  const formService = new FormService(formRepository, formNotificationService);
  // const exportService = new ExportService(exportRepository, formService);
  const exportController = new ExportController(dataSource);

  /**
   * General Export Routes
   */

  // POST /api/exports - Export data based on criteria
  router.post('/', authMiddleware, (req, res) => exportController.exportSubmissions(req, res));

  /**
   * Dropdown Data Routes
   */

  // GET /api/exports/options/members - Get members for dropdown
  router.get('/options/members', authMiddleware, (req, res) =>
    exportController.getMembersForDropdown(req, res)
  );

  // GET /api/exports/options/sites - Get sites for dropdown
  router.get('/options/sites', authMiddleware, (req, res) =>
    exportController.getSitesForDropdown(req, res)
  );

  // GET /api/exports/options/form-types - Get form types for dropdown
  router.get('/options/form-types', authMiddleware, (req, res) =>
    exportController.getFormTypesForDropdown(req, res)
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
  router.get('/types', authMiddleware, (req, res) => exportController.getExportTypes(req, res));

  // GET /api/exports/formats - Get available export formats
  router.get('/formats', authMiddleware, (req, res) => exportController.getExportFormats(req, res));

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
   * Simplified Export Routes (using POST with request body instead of URL params)
   */

  // POST /api/exports/form-type - Export submissions for specific form type
  router.post('/form-type', authMiddleware, (req, res) =>
    exportController.exportFormTypeSubmissions(req, res)
  );

  // POST /api/exports/member - Export all submissions by member
  router.post('/member', authMiddleware, (req, res) =>
    exportController.exportMemberSubmissions(req, res)
  );

  // POST /api/exports/site - Export all submissions by site
  router.post('/site', authMiddleware, (req, res) =>
    exportController.exportSiteSubmissions(req, res)
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
