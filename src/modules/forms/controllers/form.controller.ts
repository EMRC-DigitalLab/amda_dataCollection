// @ts-nocheck

// src/forms/controllers/FormController.ts
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import {
  CreateCategoryDto,
  CreateFormDto,
  FormQueryDto,
  FormSubmissionDto,
  SubmissionQueryDto,
  UpdateFormDto,
} from '../../../shared/types/form.types';
import { ResponseHelper } from '../../../shared/utils/response';
import { FormService } from '../services/form.service';

// Extended Request interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

export class FormController {
  private service: FormService;

  constructor(private readonly dataSource: DataSource) {
    this.service = new FormService(new FormRepository(dataSource));
  }

  /* ============================================================================ */
  /* Basic Form CRUD Operations                                                   */
  /* ============================================================================ */

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dto: CreateFormDto = {
        ...req.body,
        adminId: req.user?.id, // Set the current user as admin
      };
      const form = await this.service.create(dto);
      res.status(201).json({
        success: true,
        data: form,
        message: 'Form created successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dto: UpdateFormDto = {
        ...req.body,
        id: req.params.id,
      };
      const form = await this.service.update(dto);
      res.json({
        success: true,
        data: form,
        message: 'Form updated successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(req.params.id);
      res.status(204).json({
        success: true,
        message: 'Form deleted successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.findById(req.params.id);
      res.json({
        success: true,
        data: form,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  findBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.findBySlug(req.params.slug);
      res.json({
        success: true,
        data: form,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, status, formType, adminId, search } = req.query;
      const queryDto: FormQueryDto = {
        page: skip ? Math.floor(Number(skip) / (Number(take) || 50)) + 1 : 1,
        limit: take ? Number(take) : 50,
        status: status as string,
        formType: formType as string,
        adminId: adminId as string,
        search: search as string,
      };

      const [forms, total] = await this.service.findAll(queryDto);
      res.json({
        success: true,
        data: forms,
        pagination: {
          total,
          page: queryDto.page,
          limit: queryDto.limit,
          totalPages: Math.ceil(total / queryDto.limit!),
        },
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Form Structure & Schema Management                                           */
  /* ============================================================================ */

  getFormStructure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structure = await this.service.getFormStructure(req.params.id);
      res.json({
        success: true,
        data: structure,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  cloneForm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { title, slug } = req.body;
      const clonedForm = await this.service.cloneForm(req.params.id, title, slug, req.user?.id!);
      res.status(201).json({
        success: true,
        data: clonedForm,
        message: 'Form cloned successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Form Publishing & Status Management                                          */
  /* ============================================================================ */

  publishForm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.publishForm(req.params.id);
      res.json({
        success: true,
        data: form,
        message: 'Form published successfully. Dynamic table created.',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  unpublishForm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.unpublishForm(req.params.id);
      res.json({
        success: true,
        data: form,
        message: 'Form unpublished successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  archiveForm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.archiveForm(req.params.id);
      res.json({
        success: true,
        data: form,
        message: 'Form archived successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Category Management                                                          */
  /* ============================================================================ */

  addCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dto: CreateCategoryDto = req.body;
      const category = await this.service.addCategoryToForm(req.params.id, dto);
      res.status(201).json({
        success: true,
        data: category,
        message: 'Category added successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  updateCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const category = await this.service.updateCategory(req.params.categoryId, req.body);
      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  deleteCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteCategory(req.params.categoryId);
      res.status(204).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  reorderCategories = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { categoryIds } = req.body; // Array of category IDs in new order
      await this.service.reorderCategories(req.params.id, categoryIds);
      res.json({
        success: true,
        message: 'Categories reordered successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Question Management                                                          */
  /* ============================================================================ */

  addQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const question = await this.service.addQuestionToCategory(req.params.categoryId, req.body);
      res.status(201).json({
        success: true,
        data: question,
        message: 'Question added successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  updateQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const question = await this.service.updateQuestion(req.params.questionId, req.body);
      res.json({
        success: true,
        data: question,
        message: 'Question updated successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  deleteQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteQuestion(req.params.questionId);
      res.status(204).json({
        success: true,
        message: 'Question deleted successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  reorderQuestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { questionIds } = req.body; // Array of question IDs in new order
      await this.service.reorderQuestions(req.params.categoryId, questionIds);
      res.json({
        success: true,
        message: 'Questions reordered successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Form Submission Management                                                   */
  /* ============================================================================ */

  // Conditional authentication middleware for form submissions
  conditionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.findById(req.params.id);

      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // If form allows anonymous submissions, skip auth
      if (form.isAnonymous) {
        return next();
      }

      // Otherwise, require authentication
      // You would implement your auth middleware logic here
      // For now, assuming authMiddleware has already run if needed
      next();
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  submitForm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user has already submitted to this form
      const existingSubmission = await this.service.getUserSubmission(
        req.params.id,
        req.body.data.minigrid_siteId
      );

      const body = {
        ...req.body.data,
      };

      const dto: FormSubmissionDto = {
        formId: req.params.id,
        submittedBy: req.user.id,
        data: req.body.data,
      };

      let submission;
      let message;

      if (existingSubmission) {
        // Update existing submission dinstead of creating new one
        submission = await this.service.updateSubmission(
          req.params.id,
          existingSubmission.id,
          dto.data,
          req.user?.id
        );
        message = 'Form submission updated successfully';
      } else {
        // Create new submission
        submission = await this.service.submitFormData(dto);
        message = 'Form submitted successfully';
      }

      res.status(existingSubmission ? 200 : 201).json({
        success: true,
        data: submission,
        message,
        isUpdate: !!existingSubmission,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  canUserSubmit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const canSubmit = await this.service.canUserSubmit(req.params.id, req.user?.id);
      res.json({
        success: true,
        data: { canSubmit },
        message: canSubmit
          ? 'User can submit to this form'
          : 'User has already submitted to this form',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  getPublishedFormTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const formTypes = await this.service.getPublishedFormTypes();
      res.json({
        success: true,
        data: formTypes,
        message: 'Published form types retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  // Also add this method if you want to get form types with counts
  getFormTypesWithCounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const formTypesWithCounts = await this.service.getFormTypesWithCounts();
      res.json({
        success: true,
        data: formTypesWithCounts,
        message: 'Form types with counts retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };
  getMySubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const submissions = await this.service.getFormSubmissions(
        req.params.id,
        { submitted_by: req.user?.id },
        { page: Number(page), limit: Number(limit) }
      );

      res.json({
        success: true,
        data: submissions,
        message: 'Submissions retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  updateMySubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const submission = await this.service.updateSubmission(
        req.params.id,
        req.params.submissionId,
        req.body,
        req.user?.id // Only allow updating own submissions
      );
      res.json({
        success: true,
        data: submission,
        message: 'Submission updated successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  deleteMySubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteSubmission(
        req.params.id,
        req.params.submissionId,
        req.user?.id // Only allow deleting own submissions
      );
      res.status(204).json({
        success: true,
        message: 'Submission deleted successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Admin Submission Management                                                  */
  /* ============================================================================ */

  getAllSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {

      console.log("Reached controller")
      const { page = 1, limit = 10, status, dateFrom, dateTo, ...filters } = req.query;

      const queryDto: SubmissionQueryDto = {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        filters: filters as Record<string, any>,
      };

      const submissions = await this.service.getFormSubmissions(
        req.params.id,
        queryDto.filters,
        {
          page: queryDto.page!,
          limit: queryDto.limit!,
        },
        true
      );

      res.json({
        success: true,
        data: submissions,
        message: 'Submissions retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  getSubmissionById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const submission = await this.service.getSubmissionById(
        req.params.id,
        req.params.submissionId
      );
      res.json({
        success: true,
        data: submission,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };
  getSubmissionByMinigridSiteId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const submission = await this.service.getSubmissionByMinigridSiteId(
        req.params.id,
        req.params.siteId
      );
      res.json({
        success: true,
        data: submission,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  updateSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const submission = await this.service.updateSubmission(
        req.params.id,
        req.params.submissionId,
        req.body
      );
      res.json({
        success: true,
        data: submission,
        message: 'Submission updated successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  deleteSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteSubmission(req.params.id, req.params.submissionId);
      res.status(204).json({
        success: true,
        message: 'Submission deleted successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  approveSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const submission = await this.service.updateSubmissionStatus(
        req.params.id,
        req.params.submissionId,
        'APPROVED',
        req.user?.id
      );
      res.json({
        success: true,
        data: submission,
        message: 'Submission approved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  rejectSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      const submission = await this.service.updateSubmissionStatus(
        req.params.id,
        req.params.submissionId,
        'REJECTED',
        req.user?.id,
        reason
      );
      res.json({
        success: true,
        data: submission,
        message: 'Submission rejected successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ======================f====================================================== */
  /* Analytics & Reporting                                                        */
  /* ============================================================================ */

  getFormAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const analytics = await this.service.getFormAnalytics(req.params.id);
      res.json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  exportSubmissionsCSV = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const csvData = await this.service.exportSubmissionsCSV(req.params.id);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="form_submissions_${req.params.id}.csv"`
      );
      res.send(csvData);
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  exportSubmissionsExcel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const excelBuffer = await this.service.exportSubmissionsExcel(req.params.id);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="form_submissions_${req.params.id}.xlsx"`
      );
      res.send(excelBuffer);
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  getSubmissionStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getSubmissionStats(req.params.id);
      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Form Templates & Versioning                                                 */
  /* ============================================================================ */

  saveAsTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const template = await this.service.saveAsTemplate(req.params.id, req.body.templateName);
      res.status(201).json({
        success: true,
        data: template,
        message: 'Form saved as template successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  createFromTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const form = await this.service.createFromTemplate(
        req.params.templateId,
        req.body.title,
        req.body.slug,
        req.user?.id!
      );
      res.status(201).json({
        success: true,
        data: form,
        message: 'Form created from template successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  getFormVersions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const versions = await this.service.getFormVersions(req.params.id);
      res.json({
        success: true,
        data: versions,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  createFormVersion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const newVersion = await this.service.createFormVersion(
        req.params.id,
        req.body.version || 'auto',
        req.user?.id!
      );
      res.status(201).json({
        success: true,
        data: newVersion,
        message: 'New form version created successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Bulk Operations                                                              */
  /* ============================================================================ */

  bulkDeleteSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { submissionIds } = req.body;
      await this.service.bulkDeleteSubmissions(req.params.id, submissionIds);
      res.json({
        success: true,
        message: `${submissionIds.length} submissions deleted successfully`,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  bulkUpdateSubmissionStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { submissionIds, status } = req.body;
      await this.service.bulkUpdateSubmissionStatus(
        req.params.id,
        submissionIds,
        status,
        req.user?.id
      );
      res.json({
        success: true,
        message: `${submissionIds.length} submissions updated successfully`,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  bulkExportSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { submissionIds, format = 'csv' } = req.body;

      if (format === 'csv') {
        const csvData = await this.service.bulkExportSubmissionsCSV(req.params.id, submissionIds);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="bulk_export_${req.params.id}.csv"`
        );
        res.send(csvData);
      } else {
        const excelBuffer = await this.service.bulkExportSubmissionsExcel(
          req.params.id,
          submissionIds
        );
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="bulk_export_${req.params.id}.xlsx"`
        );
        res.send(excelBuffer);
      }
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Form Preview & Testing                                                       */
  /* ============================================================================ */

  previewForm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const preview = await this.service.getFormPreview(req.params.id);
      res.json({
        success: true,
        data: preview,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  testFormSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const testResult = await this.service.testFormSubmission(req.params.id, req.body);
      res.json({
        success: true,
        data: testResult,
        message: 'Form submission test completed',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /* ============================================================================ */
  /* Form Health & Monitoring                                                     */
  /* ============================================================================ */

  checkFormHealth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const health = await this.service.checkFormHealth(req.params.id);
      res.json({
        success: true,
        data: health,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  repairFormTable = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const repairResult = await this.service.repairFormTable(req.params.id);
      res.json({
        success: true,
        data: repairResult,
        message: 'Form table repair completed',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };
}
