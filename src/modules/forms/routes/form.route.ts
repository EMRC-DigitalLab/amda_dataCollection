// @ts-nocheck

// src/modules/forms/routes/form.route.ts
import { adminMiddleware } from '@/shared/middleware/admin.middleware';
import { authMiddleware } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import { FormController } from '../controllers/form.controller';
import { FormNotificationService } from '../services/form-notification.service';
import { FormService } from '../services/form.service';

// // Global WebSocket service reference
// declare global {
//   var webSocketService: any;
// }

export function createFormRoutes(dataSource: DataSource): Router {
  const router = Router();

  const formRepository = new FormRepository(dataSource);
  const webSocketService = (global as any).webSocketService;

  const formNotificationService = new FormNotificationService(webSocketService);
  const formService = new FormService(formRepository, formNotificationService);

  // Create controller with services
  const formController = new FormController(dataSource, formService);

  /* ============================================================================ */
  /* Public Form Schema Routes (Read-only)                                       */
  /* ============================================================================ */

  // Get all forms with filtering and pagination
  router.get('/', formController.findAll);

  // Get single form by ID with full structure
  router.get('/:id', formController.findById);

  // Get form by slug (useful for public form access)
  router.get('/slug/:slug', formController.findBySlug);

  // Get form structure for rendering (categories + questions)
  router.get('/:id/structure', formController.getFormStructure);

  /* ============================================================================ */
  /* Admin Form Management Routes                                                 */
  /* ============================================================================ */

  // Create new form schema
  router.post(
    '/',
    authMiddleware,
    adminMiddleware,
    // validationMiddleware(CreateFormDto),
    formController.create
  );

  // Update form schema
  router.put(
    '/:id',
    authMiddleware,
    adminMiddleware,
    // validationMiddleware(UpdateFormDto),
    formController.update
  );

  // Delete form and its dynamic table
  router.delete('/:id', authMiddleware, adminMiddleware, formController.delete);

  // Duplicate/Clone form
  router.post('/:id/clone', authMiddleware, adminMiddleware, formController.cloneForm);

  /* ============================================================================ */
  /* Form Publishing & Status Management                                          */
  /* ============================================================================ */

  // Publish form (creates dynamic submission table)
  router.post('/:id/publish', authMiddleware, adminMiddleware, formController.publishForm);

  // Unpublish form (keeps table but disables submissions)
  router.post('/:id/unpublish', authMiddleware, adminMiddleware, formController.unpublishForm);

  // Archive form
  router.post('/:id/archive', authMiddleware, adminMiddleware, formController.archiveForm);

  /* ============================================================================ */
  /* Category Management Routes                                                   */
  /* ============================================================================ */

  // Add category to form
  router.post(
    '/:id/categories',
    authMiddleware,
    adminMiddleware,
    // validationMiddleware(CreateCategoryDto),
    formController.addCategory
  );

  // Update category
  router.put(
    '/categories/:categoryId',
    authMiddleware,
    adminMiddleware,
    formController.updateCategory
  );

  // Delete category
  router.delete(
    '/categories/:categoryId',
    authMiddleware,
    adminMiddleware,
    formController.deleteCategory
  );

  // Reorder categories
  router.put(
    '/:id/categories/reorder',
    authMiddleware,
    adminMiddleware,
    formController.reorderCategories
  );

  /* ============================================================================ */
  /* Question Management Routes                                                   */
  /* ============================================================================ */

  // Add question to category
  router.post(
    '/categories/:categoryId/questions',
    authMiddleware,
    adminMiddleware,
    formController.addQuestion
  );

  // Update question
  router.put(
    '/questions/:questionId',
    authMiddleware,
    adminMiddleware,
    formController.updateQuestion
  );

  // Delete question
  router.delete(
    '/questions/:questionId',
    authMiddleware,
    adminMiddleware,
    formController.deleteQuestion
  );

  // Reorder questions within category
  router.put(
    '/categories/:categoryId/questions/reorder',
    authMiddleware,
    adminMiddleware,
    formController.reorderQuestions
  );

  router.get(
  '/:id/questions/:questionSlug/suggestions',
  authMiddleware,
  formController.getQuestionSuggestions
);
  /* ============================================================================ */
  /* Form Submission Routes (User-facing)                                        */
  /* ============================================================================ */

  // Submit form data (public or authenticated based on form settings)
  router.get('/:id/can-submit', authMiddleware, formController.canUserSubmit);

  router.post(
    '/:id/submit',
    // Conditional auth middleware based on form.isAnonymous setting
    authMiddleware,
    // validationMiddleware(FormSubmissionDto),
    formController.submitForm
  );

  // Get user's own submissions
  router.get('/:id/my-submissions', authMiddleware, formController.getMySubmissions);

  router.get(
    '/:id/submissions/:submissionId/edit',
    authMiddleware,
    formController.getSubmissionForEdit
  );

  router.get(
    '/member/submissions/overview',
    authMiddleware,
    formController.getMemberSubmissionsOverview
  );

  // THis is to get the submission overview for form entries
  router.get(
    '/member/submissions-overview',
    authMiddleware,
    formController.getMemberSubmissionsOverview
  );
  // Update user's own submission (if allowed)
  router.put('/:id/submissions/:submissionId', authMiddleware, formController.updateMySubmission);

  router.get(
    '/:id/submission-requirements',
    authMiddleware,
    formController.getSubmissionRequirements
  );
  // Delete user's own submission
  router.delete(
    '/:id/submissions/:submissionId',
    authMiddleware,
    formController.deleteMySubmission
  );

  /* ============================================================================ */
  /* Admin Submission Management Routes                                           */
  /* ============================================================================ */

  // Get all submissions for a form (with filtering/pagination)
  router.get('/:id/submissions', authMiddleware, adminMiddleware, formController.getAllSubmissions);

  // Get single submission by ID
  router.get(
    '/:id/submissions/:submissionId',
    authMiddleware,
    adminMiddleware,
    formController.getSubmissionById
  );
  router.get(
    '/:id/submissions-site/:siteId',
    authMiddleware,
    formController.getSubmissionByMinigridSiteId
  );

  // Update any submission (admin only)
  router.put(
    '/:id/submissions/:submissionId/admin',
    authMiddleware,
    adminMiddleware,
    formController.updateSubmission
  );

  // Delete any submission (admin only)
  router.delete(
    '/:id/submissions/:submissionId/admin',
    authMiddleware,
    adminMiddleware,
    formController.deleteSubmission
  );

  // Approve/Reject submission (if form requires approval)
  router.post(
    '/:id/submissions/:submissionId/approve',
    authMiddleware,
    adminMiddleware,
    formController.approveSubmission
  );

  router.post(
    '/:id/submissions/:submissionId/reject',
    authMiddleware,
    adminMiddleware,
    formController.rejectSubmission
  );

  router.get(
    '/all/submissions',
    authMiddleware,
    adminMiddleware,
    formController.getAllFormSubmissions
  );

  // Get all submissions grouped by form type (admin only)
  router.get(
    '/all/submissions/by-form-type',
    authMiddleware,
    adminMiddleware,
    formController.getAllSubmissionsByFormType
  );

  // Export all submissions from all forms as CSV/Excelr
  router.get(
    '/all/submissions/export',
    authMiddleware,
    adminMiddleware,
    formController.exportAllSubmissions
  );

  // Global dashboard for admin overview (optional)
  // router.get(
  //   '/all/dashboard',
  //   authMiddleware,
  //   adminMiddleware,
  //   formController.getGlobalDashboard
  // );

  /* ============================================================================ */
  /* Analytics & Reporting Routes                                                 */
  /* ============================================================================ */

  // Get form analytics (submission stats, completion rates, etc.)
  router.get('/:id/analytics', authMiddleware, adminMiddleware, formController.getFormAnalytics);

  // Export submissions as CSV
  router.get(
    '/:id/export/csv',
    authMiddleware,
    adminMiddleware,
    formController.exportSubmissionsCSV
  );

  // Export submissions as Excel
  router.get(
    '/:id/export/excel',
    authMiddleware,
    adminMiddleware,
    formController.exportSubmissionsExcel
  );

  // Get submission statistics
  router.get('/:id/stats', authMiddleware, adminMiddleware, formController.getSubmissionStats);

  router.get(
    '/admin/dashboard/overview',
    // authMiddleware,
    // adminMiddleware,
    formController.getAdminDashboardOverview
  );

  router.get(
    '/admin/dashboard/quick-stats',
    authMiddleware,
    adminMiddleware,
    formController.getAdminQuickStats
  );

  router.get(
    '/admin/dashboard/analytics/:metric',
    authMiddleware,
    adminMiddleware,
    formController.getDetailedAnalytics
  );

  router.get(
    '/admin/dashboard/alerts',
    authMiddleware,
    adminMiddleware,
    formController.getAdminAlerts
  );

  router.get(
    '/admin/dashboard/recommendations',
    authMiddleware,
    adminMiddleware,
    formController.getAdminRecommendations
  );

  router.get(
    '/admin/dashboard/export',
    authMiddleware,
    // adminMiddleware,
    formController.exportDashboardData
  );

  router.get(
    '/admin/dashboard/live-updates',
    authMiddleware,
    adminMiddleware,
    formController.getLiveDashboardUpdates
  );

  router.get(
    '/admin/dashboard/form-types/:formTypeId',
    authMiddleware,
    adminMiddleware,
    formController.getFormTypeBreakdown
  );

  router.get(
    '/admin/dashboard/comparison',
    authMiddleware,
    adminMiddleware,
    formController.getTimeComparison
  );
  /* ============================================================================ */
  /* Form Template & Versioning Routes                                           */
  /* ============================================================================ */

  // Save form as template
  router.post(
    '/:id/save-as-template',
    authMiddleware,
    adminMiddleware,
    formController.saveAsTemplate
  );

  // Create form from template
  router.post(
    '/create-from-template/:templateId',
    authMiddleware,
    adminMiddleware,
    formController.createFromTemplate
  );

  // Get form versions
  router.get('/:id/versions', authMiddleware, adminMiddleware, formController.getFormVersions);

  // Create new version of form
  router.post(
    '/:id/create-version',
    authMiddleware,
    adminMiddleware,
    formController.createFormVersion
  );

  /* ============================================================================ */
  /* Bulk Operations Routes                                                       */
  /* ============================================================================ */

  // Bulk delete submissions
  router.post('/:id/submissions/bulk-delete', authMiddleware, formController.bulkDeleteSubmissions);

  // Bulk update submission status
  router.post(
    '/:id/submissions/bulk-status',
    authMiddleware,
    adminMiddleware,
    formController.bulkUpdateSubmissionStatus
  );

  // Bulk export submissions
  router.post(
    '/:id/submissions/bulk-export',
    authMiddleware,
    adminMiddleware,
    formController.bulkExportSubmissions
  );

  /* ============================================================================ */
  /* Form Preview & Testing Routes                                                */
  /* ============================================================================ */

  // Preview form (for testing before publishing)
  router.get('/:id/preview', authMiddleware, adminMiddleware, formController.previewForm);

  // Test form submission (doesn't save to database)
  router.post(
    '/:id/test-submit',
    authMiddleware,
    adminMiddleware,
    formController.testFormSubmission
  );

  /* ============================================================================ */
  /* Form Health & Monitoring Routes                                              */
  /* ============================================================================ */

  // Check form health (table exists, schema matches, etc.)
  router.get('/:id/health', authMiddleware, adminMiddleware, formController.checkFormHealth);

  // Repair form table (if schema mismatch detected)
  router.post('/:id/repair-table', authMiddleware, adminMiddleware, formController.repairFormTable);

  // Get all published form types with counts
  router.get('/types/published', authMiddleware, formController.getPublishedFormTypes);

  // Get form types with counts by status (requires auth for detailed analytics)
  router.get(
    '/types/analytics',
    authMiddleware,
    adminMiddleware,
    formController.getFormTypesWithCounts
  );

  // Get all forms by type (with optional status filter)
  router.get('/types/:formType/forms', formController.findAll); // This will use existing findAll with formType filter

  // Get published forms by type only
  router.get('/types/:formType/published', (req: Request, res: Response, next: NextFunction) => {
    // Add formType and status to query params before calling findAll
    req.query.formType = req.params.formType;
    req.query.status = 'PUBLISHED';
    formController.findAll(req, res, next);
  });

  return router;
}
