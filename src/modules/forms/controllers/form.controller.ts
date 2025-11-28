// @ts-nocheck

// src/forms/controllers/FormController.ts
import { NextFunction, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { FormStatus, FormSubmissionScope } from '../../../database/entities/form.entity';
import { FormRepository } from '../../../database/repositories/forms/form.repository';
import {
  CreateCategoryDto,
  CreateFormDto,
  FormQueryDto,
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

 getQuestionSuggestions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: formId, questionSlug } = req.params;
    const memberId = req.user?.id;

    if (!memberId) {
      return ResponseHelper.error(res, 'Authentication required', 401);
    }

    const result = await this.service.getQuestionSuggestions(
      formId,
      questionSlug,
      memberId
    );

    

    res.json({
      success: true,
      data: result,
      message: 'Question suggestions retrieved successfully',
    });
  } catch (err) {
    ResponseHelper.error(res, err.message, 400);
  }
};

/**
 * Format answer for display based on question type
 */
private formatSuggestionAnswer(
  answer: any,
  questionType: string,
  options?: any
): { display: string; preview?: string } {
  if (answer === null || answer === undefined || answer === '') {
    return { display: 'No answer provided' };
  }

  switch (questionType) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return {
        display: String(answer),
        preview: String(answer).length > 50 
          ? String(answer).substring(0, 47) + '...' 
          : String(answer),
      };

    case 'textarea':
      return {
        display: String(answer),
        preview: String(answer).length > 100 
          ? String(answer).substring(0, 97) + '...' 
          : String(answer),
      };

    case 'number':
    case 'currency':
      return {
        display: questionType === 'currency' 
          ? `$${Number(answer).toLocaleString()}` 
          : String(answer),
      };

    case 'date':
      return {
        display: new Date(answer).toLocaleDateString(),
      };

    case 'datetime':
      return {
        display: new Date(answer).toLocaleString(),
      };

    case 'boolean':
      return {
        display: answer ? 'Yes' : 'No',
      };

    case 'select':
      return {
        display: String(answer),
      };

    case 'multiselect':
      if (Array.isArray(answer)) {
        const display = answer.join(', ');
        return {
          display,
          preview: display.length > 80 
            ? display.substring(0, 77) + '...' 
            : display,
        };
      }
      return { display: String(answer) };

    case 'file':
      // Assuming file answers store file paths or URLs
      return {
        display: 'File uploaded',
        preview: String(answer),
      };

    default:
      return { display: String(answer) };
  }
}

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

  submitForm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: formId } = req.params;
      const memberId = req.user?.id;
      const submissionData = req.body.data;

      if (!memberId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate eligibility
      const eligibility = await this.canUserSubmit(formId, memberId);

      console.log(eligibility, "eligibility")

      // if (!eligibility.canSubmit) {
      //   return res.status(400).json({
      //     error: eligibility.reason || 'Cannot submit form',
      //     metadata: eligibility.metadata,
      //   });
      // }

      // Additional validation for country-level forms
      if (eligibility.scope === FormSubmissionScope.COUNTRY_LEVEL) {
        if (!submissionData.country) {
          return res.status(400).json({
            error: 'Country selection is required',
            metadata: eligibility.metadata,
          });
        }

        // Check if this country is available
        const availableCountries = eligibility.metadata?.availableCountries || [];
        if (!availableCountries.includes(submissionData.country)) {
          return res.status(400).json({
            error: `Cannot submit for ${submissionData.country}. Either you don't operate there or you've already submitted.`,
            availableCountries,
          });
        }
      }

      // Submit the form
      const submission = await this.service.submitFormData({ formId, data: submissionData, submittedBy: memberId });

      res.status(201).json({
        success: true,
        message: 'Form submitted successfully',
        submission,
        scope: eligibility.scope,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      res.status(400).json({ error: error.message });
    }
  }
  async canUserSubmit(
    formId: string,
    memberId: string,
    scopeData?: { siteId?: string; country?: string }
  ): Promise<{
    canSubmit: boolean;
    reason?: string;
    existingSubmissionId?: string;
  }> {
    const form = await this.service.findById(formId);
    console.log(form, "form in can user submit")

    if (!form) {
      return { canSubmit: false, reason: 'Form not found' };
    }

    if (form.status !== FormStatus.PUBLISHED) {
      return { canSubmit: false, reason: 'Form is not published' };
    }

    if (!form.tableCreated || !form.tableName) {
      return { canSubmit: false, reason: 'Form is not ready for submissions' };
    }

    const scope = form.submissionScope;

    // SITE_LEVEL check
    if (scope === FormSubmissionScope.SITE_LEVEL) {
      if (!scopeData?.siteId) {
        return { canSubmit: false, reason: 'Site ID is required' };
      }

      // Verify site belongs to member
      const site = await this.dataSource.query(
        `SELECT EXISTS(SELECT 1 FROM minigrid_sites WHERE id = $1 AND "memberUuid" = $2) as exists`,
        [scopeData.siteId, memberId]
      );

      if (!site[0].exists) {
        return { canSubmit: false, reason: 'Site not found or does not belong to you' };
      }

      if (form.allowOnlyOneSubmissionPerScope) {
        const existing = await this.dataSource.query(
          `SELECT id FROM "${form.tableName}" 
         WHERE form_id = $1 AND minigrid_siteId = $2 
         LIMIT 1`,
          [formId, scopeData.siteId]
        );

        if (existing.length > 0) {
          return {
            canSubmit: false,
            reason: 'You have already submitted this form for this site',
            existingSubmissionId: existing[0].id,
          };
        }
      }
    }

    // COUNTRY_LEVEL check
    else if (scope === FormSubmissionScope.COUNTRY_LEVEL) {
      if (!scopeData?.country) {
        return { canSubmit: false, reason: 'Country is required' };
      }

      // Verify member operates in this country
      const hasSites = await this.dataSource.query(
        `SELECT EXISTS(SELECT 1 FROM minigrid_sites WHERE "memberUuid" = $1 AND country = $2) as exists`,
        [memberId, scopeData.country]
      );

      if (!hasSites[0].exists) {
        return { canSubmit: false, reason: 'You do not have any sites in this country' };
      }

      if (form.allowOnlyOneSubmissionPerScope) {
        const existing = await this.dataSource.query(
          `SELECT id FROM "${form.tableName}" 
         WHERE form_id = $1 AND submitted_by = $2 AND country = $3 
         LIMIT 1`,
          [formId, memberId, scopeData.country]
        );

        if (existing.length > 0) {
          return {
            canSubmit: false,
            reason: 'You have already submitted this form for this country',
            existingSubmissionId: existing[0].id,
          };
        }
      }
    }

    // MEMBER_LEVEL check
    else if (scope === FormSubmissionScope.MEMBER_LEVEL) {
      if (form.allowOnlyOneSubmissionPerScope) {
        const existing = await this.dataSource.query(
          `SELECT id FROM "${form.tableName}" 
         WHERE form_id = $1 AND submitted_by = $2 
         LIMIT 1`,
          [formId, memberId]
        );

        if (existing.length > 0) {
          return {
            canSubmit: false,
            reason: 'You have already submitted this form',
            existingSubmissionId: existing[0].id,
          };
        }
      }
    }

    return { canSubmit: true };
  }

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
  async getMySubmissions(req: Request, res: Response): Promise<void> {
    try {
      const { id: formId } = req.params;
      const memberId = req.user?.id;

      if (!memberId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const submissions = await this.formRepository.getMemberFormSubmissions(formId, memberId);

      res.json({
        success: true,
        count: submissions.length,
        submissions,
      });
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: error.message });
    }
  }

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

  async getSubmissionForEdit(req: Request, res: Response): Promise<void> {
    try {
      const { id: formId, submissionId } = req.params;
      const memberId = req.user?.id;

      if (!memberId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const submission = await this.formRepository.getSubmissionForEdit(
        formId,
        submissionId,
        memberId
      );

      if (!submission) {
        return res.status(404).json({
          error: 'Submission not found or you do not have permission to edit it',
        });
      }

      res.json({
        success: true,
        submission,
      });
    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({ error: error.message });
    }
  }

  getSubmissionRequirements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: formId } = req.params;
      const memberId = req.user?.id;

      if (!memberId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const requirements = await this.service.getFormSubmissionRequirements(formId, memberId);

      return res.status(200).json({
        success: true,
        data: requirements,
      });
    } catch (error) {
      next(error);
    }
  };

  async getMemberFormOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const memberId = req.user?.id;

      if (!memberId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const overview = await this.service.getMemberSubmissionOverview(memberId);

      return res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }

  /* ============================================================================ */
  /* Admin Submission Management                                                  */
  /* ============================================================================ */

  getAllSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
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
  getSubmissionByMinigridSiteId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
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

  getAllFormSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        page = 1,
        limit = 50,
        // Optional filters - but by default gets ALL submissions from ALL forms
        formType,
        status,
        dateFrom,
        dateTo,
        adminId,
        search,
        formStatus = 'PUBLISHED', // Only get submissions from published forms by default
      } = req.query;

      const queryDto = {
        page: Number(page),
        limit: Number(limit),
        // These are optional filters - remove them to get everything
        formType: formType as string,
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        adminId: adminId as string,
        search: search as string,
        formStatus: formStatus as string,
      };

      // This gets ALL submissions from ALL forms (with optional filtering)
      const result = await this.service.getAllSubmissionsFromAllForms(queryDto);

      res.json({
        success: true,
        data: result.submissions, // Array of ALL submissions across ALL forms
        pagination: {
          total: result.total,
          page: queryDto.page,
          limit: queryDto.limit,
          totalPages: Math.ceil(result.total / queryDto.limit),
        },
        summary: result.summary,
        message: 'All submissions from all forms retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  // Optional: Get submissions grouped by form type
  getAllSubmissionsByFormType = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page = 1, limit = 50, status, dateFrom, dateTo } = req.query;

      const queryDto = {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };

      const result = await this.service.getAllSubmissionsGroupedByFormType(queryDto);

      res.json({
        success: true,
        data: result,
        message: 'Submissions grouped by form type retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  // Export all submissions across all forms
  exportAllSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { format = 'xlsx', formType, status, dateFrom, dateTo } = req.query;

      const filters = {
        formType: formType as string,
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };

      if (format === 'csv') {
        const csvData = await this.service.exportAllSubmissionsCSV(filters);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="all_submissions.csv"');
        res.send(csvData);
      } else {
        const excelBuffer = await this.service.exportAllSubmissionsExcel(filters);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename="all_submissions.xlsx"');
        res.send(excelBuffer);
      }
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

  // Add these methods to FormController class

  /**
   * Get comprehensive admin dashboard overview
   * GET /api/forms/admin/dashboard/overview
   */
  getAdminDashboardOverview = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { dateFrom, dateTo, formType, adminId } = req.query;

      const filters: any = {};

      if (dateFrom) {
        filters.dateFrom = new Date(dateFrom as string);
      }

      if (dateTo) {
        filters.dateTo = new Date(dateTo as string);
      }

      if (formType) {
        filters.formType = formType as string;
      }

      // Allow filtering by specific admin, or default to current admin
      if (adminId) {
        filters.adminId = adminId as string;
      } else if (req.user?.role !== 'SUPER_ADMIN') {
        // If not super admin, only show their own forms
        filters.adminId = req.user?.id;
      }

      const overview = await this.service.getAdminDashboardOverview(filters);

      console.log(overview, 'this is the dashboard ovevriew');
      res.json({
        success: true,
        data: overview,
        message: 'Admin dashboard overview retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Get quick stats for admin dashboard widgets
   * GET /api/forms/admin/dashboard/quick-stats
   */
  getAdminQuickStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getAdminQuickStats();

      res.json({
        success: true,
        data: stats,
        message: 'Quick stats retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Get detailed analytics for a specific metric
   * GET /api/forms/admin/dashboard/analytics/:metric
   */
  getDetailedAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { metric } = req.params;
      const { dateFrom, dateTo, formType } = req.query;

      const filters: any = {
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        formType: formType as string,
      };

      let analytics;

      switch (metric) {
        case 'submissions':
          analytics = await this.service.getSubmissionAnalytics(filters);
          break;

        case 'members':
          analytics = await this.service.getMemberAnalytics(filters);
          break;

        case 'forms':
          analytics = await this.service.getFormAnalytics(filters);
          break;

        case 'reviews':
          analytics = await this.service.getReviewAnalytics(filters);
          break;

        default:
          return ResponseHelper.error(res, 'Invalid metric type', 400);
      }

      res.json({
        success: true,
        data: analytics,
        message: `${metric} analytics retrieved successfully`,
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Get alerts and notifications for admin
   * GET /api/forms/admin/dashboard/alerts
   */
  getAdminAlerts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { priority, type } = req.query;

      // Get overview which includes insights
      const overview = await this.service.getAdminDashboardOverview({});

      let alerts = overview.insights.alerts;

      // Filter by type if provided
      if (type && ['critical', 'warning', 'info'].includes(type as string)) {
        alerts = alerts.filter(alert => alert.type === type);
      }

      // Filter by action required
      if (priority === 'actionRequired') {
        alerts = alerts.filter(alert => alert.actionRequired);
      }

      res.json({
        success: true,
        data: {
          alerts,
          totalAlerts: alerts.length,
          criticalCount: alerts.filter(a => a.type === 'critical').length,
          warningCount: alerts.filter(a => a.type === 'warning').length,
          infoCount: alerts.filter(a => a.type === 'info').length,
        },
        message: 'Admin alerts retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Get recommendations for admin
   * GET /api/forms/admin/dashboard/recommendations
   */
  getAdminRecommendations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { priority } = req.query;

      // Get overview which includes insights
      const overview = await this.service.getAdminDashboardOverview({});

      let recommendations = overview.insights.recommendations;

      // Filter by priority if provided
      if (priority && ['high', 'medium', 'low'].includes(priority as string)) {
        recommendations = recommendations.filter(rec => rec.priority === priority);
      }

      res.json({
        success: true,
        data: {
          recommendations,
          totalRecommendations: recommendations.length,
          highPriority: recommendations.filter(r => r.priority === 'high').length,
          mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
          lowPriority: recommendations.filter(r => r.priority === 'low').length,
        },
        message: 'Admin recommendations retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Export dashboard data as Excel
   * GET /api/forms/admin/dashboard/export
   */
  exportDashboardData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo, formType } = req.query;

      const filters: any = {
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        formType: formType as string,
      };

      const overview = await this.service.getAdminDashboardOverview(filters);

      // Create Excel workbook with multiple sheets
      const excelBuffer = await this.service.exportDashboardToExcel(overview);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="admin_dashboard_${new Date().toISOString().split('T')[0]}.xlsx"`
      );
      res.send(excelBuffer);
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Get real-time dashboard updates (for WebSocket/polling)
   * GET /api/forms/admin/dashboard/live-updates
   */
  getLiveDashboardUpdates = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Get only the most recent changes (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const updates = {
        newSubmissions: await this.service.getRecentSubmissionsCount(fiveMinutesAgo),
        newReviews: await this.service.getRecentReviewsCount(fiveMinutesAgo),
        newMembers: await this.service.getNewMembersCount(fiveMinutesAgo),
        systemChanges: await this.service.getRecentSystemChanges(fiveMinutesAgo),
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        data: updates,
        message: 'Live dashboard updates retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Get specific form type breakdown
   * GET /api/forms/admin/dashboard/form-types/:formTypeId
   */
  getFormTypeBreakdown = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { formTypeId } = req.params;
      const { dateFrom, dateTo } = req.query;

      const filters: any = {
        formType: formTypeId,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      };

      const breakdown = await this.service.getFormTypeDetailedBreakdown(filters);

      res.json({
        success: true,
        data: breakdown,
        message: 'Form type breakdown retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };

  /**
   * Get comparison between time periods
   * GET /api/forms/admin/dashboard/comparison
   */
  getTimeComparison = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { period = 'month' } = req.query; // 'week', 'month', 'quarter', 'year'

      const comparison = await this.service.getTimePeriodComparison(period as string);

      res.json({
        success: true,
        data: comparison,
        message: 'Time period comparison retrieved successfully',
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
  getMemberSubmissionsOverview = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const memberId = req.user?.id;

      if (!memberId) {
        return ResponseHelper.error(res, 'Member ID is required', 401);
      }

      const overview = await this.service.getMemberSubmissionsOverview(memberId);

      res.json({
        success: true,
        data: overview,
        message: 'Member submissions overview retrieved successfully',
      });
    } catch (err) {
      ResponseHelper.error(res, err.message, 400);
    }
  };
}
