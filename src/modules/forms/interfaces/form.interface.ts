// src/modules/forms/interfaces/form.interface.ts
import { Category } from '../../../database/entities/category.entity';
import { Form, FormStatus } from '../../../database/entities/form.entity';
import { Question } from '../../../database/entities/question.entity';
import { CreateCategoryDto, CreateFormDto, UpdateFormDto } from '../../../shared/types/form.types';

export interface IFormRepository {
  getPublishedFormTypes(): unknown;
  getFormsByType(formType: string, status: FormStatus | undefined): Form[] | PromiseLike<Form[]>;
  getFormTypesByStatus(DRAFT: FormStatus): unknown;
  getAllFormTypesCounts(): unknown;
  getFormTypesByStatus(ARCHIVED: FormStatus): unknown;
  getFormTypesByStatus(PUBLISHED: FormStatus): unknown;
  categoryRepo: any;
  /* ============================================================================ */
  /* Basic Form CRUD Operations                                                   */
  /* ============================================================================ */

  createForm(dto: CreateFormDto): Promise<Form>;
  updateForm(dto: UpdateFormDto): Promise<Form>;
  deleteForm(id: string): Promise<void>;
  findFormById(id: string): Promise<Form | null>;
  findFormBySlug(slug: string): Promise<Form | null>;
  findAllForms(opts?: {
    skip?: number;
    take?: number;
    status?: FormStatus;
    formType?: string;
    adminId?: string;
  }): Promise<[Form[], number]>;

  /* ============================================================================ */
  /* Category Management                                                          */
  /* ============================================================================ */

  addCategoryToForm(formId: string, categoryDto: CreateCategoryDto): Promise<Category>;
  updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category>;
  deleteCategory(categoryId: string): Promise<void>;

  /* ============================================================================ */
  /* Question Management                                                          */
  /* ============================================================================ */

  addQuestionToCategory(categoryId: string, questionDto: any): Promise<Question>;
  updateQuestion(questionId: string, updates: Partial<Question>): Promise<Question>;
  deleteQuestion(questionId: string): Promise<void>;

  /* ============================================================================ */
  /* Form Publishing & Status Management                                          */
  /* ============================================================================ */

  publishForm(formId: string): Promise<Form>;
  unpublishForm(formId: string): Promise<Form>;

  /* ============================================================================ */
  /* Form Submission Management                                                   */
  /* ============================================================================ */

  submitFormData(
    formId: string,
    submissionData: Record<string, any>,
    submittedBy?: string
  ): Promise<any>;

  getFormSubmissions(
    formId: string,
    filters?: Record<string, any>,
    pagination?: { page: number; limit: number },
    populate?: boolean
  ): Promise<any[]>;

  getSubmissionById(formId: string, submissionId: string): Promise<any | null>;

  getSubmissionByMinigridSiteId(formId: string, siteId: string): Promise<any | null>;
  updateSubmission(
    formId: string,
    submissionId: string,
    updates: Record<string, any>
  ): Promise<any>;

  deleteSubmission(formId: string, submissionId: string): Promise<void>;

  /* ============================================================================ */
  /* Bulk Operations                                                              */
  /* ============================================================================ */

  bulkDeleteSubmissions(formId: string, submissionIds: string[]): Promise<void>;

  bulkUpdateSubmissionStatus(
    formId: string,
    submissionIds: string[],
    status: string,
    reviewerId?: string
  ): Promise<void>;

  exportFormSubmissions(formId: string, submissionIds?: string[]): Promise<any[]>;

  /* ============================================================================ */
  /* Analytics & Statistics                                                       */
  /* ============================================================================ */

  getFormStatistics(formId: string): Promise<{
    totalSubmissions: number;
    statusDistribution: Record<string, number>;
    submissionsByDate: Array<{ date: string; count: number }>;
    averageCompletionTime: number;
  }>;

  /* ============================================================================ */
  /* Form Health & Monitoring                                                     */
  /* ============================================================================ */

  checkTableHealth(formId: string): Promise<{
    formId: string;
    tableName?: string;
    tableExists: boolean;
    schemaMatches: boolean;
    submissionCount: number;
    issues: string[];
  }>;

  repairFormTable(formId: string): Promise<{
    lastSubmissionAt: any;
    lastMigrationVersion: any;
    tableCreated: any;
    success: boolean;
    tableName: string;
    message: string;
  }>;
}
