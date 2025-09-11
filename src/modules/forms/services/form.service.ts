// @ts-nocheck

import { Injectable } from 'injection-js';
import * as XLSX from 'xlsx';
import { Category } from '../../../database/entities/category.entity';
import { Form, FormStatus } from '../../../database/entities/form.entity';
import { Question } from '../../../database/entities/question.entity';
import {
  CreateCategoryDto,
  CreateFormDto,
  FormQueryDto,
  FormSubmissionDto,
  UpdateFormDto,
} from '../../../shared/types/form.types';
import { IFormRepository } from '../interfaces/form.interface';

@Injectable()
export class FormService {
  constructor(private readonly repo: IFormRepository) {}

  /* ============================================================================ */
  /* Basic Form CRUD Operations                                                   */
  /* ============================================================================ */

  async create(dto: CreateFormDto): Promise<Form> {
    // Validate form data before creation
    await this.validateFormDto(dto);

    return this.repo.createForm(dto);
  }

  async update(dto: UpdateFormDto): Promise<Form> {
    // Check if form exists
    const existingForm = await this.repo.findFormById(dto.id);
    if (!existingForm) {
      throw new Error('Form not found');
    }

    // Validate updates
    if (dto.slug && dto.slug !== existingForm.slug) {
      await this.validateSlugUniqueness(dto.slug);
    }

    // If form is published and structure changes, validate compatibility
    if (existingForm.status === FormStatus.PUBLISHED && dto.categories) {
      await this.validateStructureChanges(existingForm, dto);
    }

    return this.repo.updateForm(dto);
  }

  async delete(id: string): Promise<void> {
    const form = await this.findById(id);

    // Check if form has submissions before deleting
    if (form.tableCreated && form.tableName) {
      const submissionCount = await this.getSubmissionCount(id);
      if (submissionCount > 0) {
        throw new Error(
          `Cannot delete form with ${submissionCount} submissions. Archive it instead.`
        );
      }
    }

    await this.repo.deleteForm(id);
  }

  async findById(id: string): Promise<Form> {
    const form = await this.repo.findFormById(id);
    if (!form) throw new Error('Form not found');
    return form;
  }

  async findBySlug(slug: string): Promise<Form> {
    const form = await this.repo.findFormBySlug(slug);
    if (!form) throw new Error('Form not found');
    return form;
  }

  async findAll(queryDto: FormQueryDto = {}): Promise<[Form[], number]> {
    const pagination = {
      skip: queryDto.page ? (queryDto.page - 1) * (queryDto.limit || 50) : 0,
      take: queryDto.limit || 50,
      status: queryDto.status as FormStatus,
      formType: queryDto.formType,
      adminId: queryDto.adminId,
    };

    return this.repo.findAllForms(pagination);
  }

  async getPublishedFormTypes(): Promise<{ formType: string; count: number }[]> {
    const formTypes = await this.repo.getPublishedFormTypes();
    return formTypes;
  }

  async getFormTypesWithCounts(): Promise<{
    published: { formType: string; count: number }[];
    draft: { formType: string; count: number }[];
    archived: { formType: string; count: number }[];
    total: { formType: string; count: number }[];
  }> {
    const publishedTypes = await this.repo.getFormTypesByStatus(FormStatus.PUBLISHED);
    const draftTypes = await this.repo.getFormTypesByStatus(FormStatus.DRAFT);
    const archivedTypes = await this.repo.getFormTypesByStatus(FormStatus.ARCHIVED);
    const allTypes = await this.repo.getAllFormTypesCounts();

    return {
      published: publishedTypes,
      draft: draftTypes,
      archived: archivedTypes,
      total: allTypes,
    };
  }

  async getFormsByType(formType: string, status?: FormStatus): Promise<Form[]> {
    return this.repo.getFormsByType(formType, status);
  }

  /* ============================================================================ */
  /* Form Structure Management                                                    */
  /* ============================================================================ */

  async getFormStructure(formId: string): Promise<Form> {
    const form = await this.findById(formId);

    // Only return published forms for public access
    if (form.status !== FormStatus.PUBLISHED) {
      throw new Error('Form is not published');
    }

    return form;
  }

  async cloneForm(
    formId: string,
    newTitle: string,
    newSlug: string,
    adminId: string
  ): Promise<Form> {
    const originalForm = await this.findById(formId);

    // Validate new slug
    await this.validateSlugUniqueness(newSlug);

    const cloneDto: CreateFormDto = {
      title: newTitle,
      slug: newSlug,
      description: originalForm.description,
      formType: originalForm.formType,
      adminId: adminId,
      parentId: originalForm.id, // Link to original
      categories: originalForm.categories.map(category => ({
        name: category.name,
        slug: `${category.slug}_cloned`,
        sortOrder: category.sortOrder,
        questions: category.questions.map(question => ({
          kpi: question.kpi,
          slug: question.slug,
          description: question.description,
          type: question.type,
          required: question.required,
          sortOrder: question.sortOrder,
          options: { ...question.options },
        })),
      })),
    };

    return this.create(cloneDto);
  }

  /* ============================================================================ */
  /* Form Publishing & Status Management                                          */
  /* ============================================================================ */

  async publishForm(formId: string): Promise<Form> {
    const form = await this.findById(formId);

    // Validate form is ready for publishing
    await this.validateFormForPublishing(form);

    return this.repo.publishForm(formId);
  }

  async unpublishForm(formId: string): Promise<Form> {
    const form = await this.findById(formId);

    if (form.status !== FormStatus.PUBLISHED) {
      throw new Error('Form is not published');
    }

    return this.repo.unpublishForm(formId);
  }

  async archiveForm(formId: string): Promise<Form> {
    const form = await this.findById(formId);

    // Update form status to archived
    form.status = FormStatus.ARCHIVED;
    form.archivedAt = new Date();

    const updateDto: UpdateFormDto = {
      id: formId,
      status: FormStatus.ARCHIVED,
    };

    return this.repo.updateForm(updateDto);
  }

  /* ============================================================================ */
  /* Category Management                                                          */
  /* ============================================================================ */

  async addCategoryToForm(formId: string, dto: CreateCategoryDto): Promise<Category> {
    const form = await this.findById(formId);

    // Validate category slug is unique within the form
    const existingCategory = form.categories.find(cat => cat.slug === dto.slug);
    if (existingCategory) {
      throw new Error('Category slug already exists in this form');
    }

    return this.repo.addCategoryToForm(formId, dto);
  }

  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
    return this.repo.updateCategory(categoryId, updates);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    // Check if category has questions
    const category = await this.repo.categoryRepo?.findOne({
      where: { id: categoryId },
      relations: { questions: true },
    });

    if (category?.questions && category.questions.length > 0) {
      throw new Error('Cannot delete category with questions. Delete questions first.');
    }

    await this.repo.deleteCategory(categoryId);
  }

  async reorderCategories(formId: string, categoryIds: string[]): Promise<void> {
    const form = await this.findById(formId);

    // Validate all category IDs belong to this form
    const formCategoryIds = form.categories.map(cat => cat.id);
    const invalidIds = categoryIds.filter(id => !formCategoryIds.includes(id));

    if (invalidIds.length > 0) {
      throw new Error(`Invalid category IDs: ${invalidIds.join(', ')}`);
    }

    // Update sort order for each category
    for (let i = 0; i < categoryIds.length; i++) {
      await this.repo.updateCategory(categoryIds[i], { sortOrder: i });
    }
  }

  /* ============================================================================ */
  /* Question Management                                                          */
  /* ============================================================================ */

  async addQuestionToCategory(categoryId: string, questionDto: any): Promise<Question> {
    // Validate question type and options
    await this.validateQuestionDto(questionDto);

    return this.repo.addQuestionToCategory(categoryId, questionDto);
  }

  async updateQuestion(questionId: string, updates: Partial<Question>): Promise<Question> {
    if (updates.type || updates.options) {
      await this.validateQuestionDto(updates);
    }

    return this.repo.updateQuestion(questionId, updates);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    await this.repo.deleteQuestion(questionId);
  }

  async reorderQuestions(categoryId: string, questionIds: string[]): Promise<void> {
    // Update sort order for each question
    for (let i = 0; i < questionIds.length; i++) {
      await this.repo.updateQuestion(questionIds[i], { sortOrder: i });
    }
  }

  /* ============================================================================ */
  /* Form Submission Management                                                   */
  /* ============================================================================ */

  async submitFormData(dto: FormSubmissionDto): Promise<any> {
    console.log(dto, 'this is the real dto');
    const form = await this.findById(dto.formId);

    // Validate form is accepting submissions
    if (form.status !== FormStatus.PUBLISHED) {
      throw new Error('Form is not accepting submissions');
    }

    if (!form.tableCreated) {
      throw new Error('Form submission table not created');
    }

    // Validate submission data against form schema
    await this.validateSubmissionData(form, dto.data);

    // Check submission limits if any
    if (form.maxSubmissions) {
      const currentCount = await this.getSubmissionCount(dto.formId);
      if (currentCount >= form.maxSubmissions) {
        throw new Error('Form has reached maximum submissions limit');
      }
    }

    // Check if user has already submitted (if multiple submissions not allowed)
    if (!form.allowMultipleSubmissions && dto.submittedBy) {
      const existingSubmission = await this.getUserSubmissionCount(dto.formId, dto.minigrid_siteId);
      if (existingSubmission > 0) {
        throw new Error('Multiple submissions not allowed for this form');
      }
    }

    return this.repo.submitFormData(dto.formId, dto.data, dto.submittedBy);
  }

  async getUserSubmission(formId: string, minigrid_siteId?: string): Promise<any | null> {
    if (!minigrid_siteId) return null;

    console.log(minigrid_siteId);

    const submissions = await this.repo.getFormSubmissions(
      formId,
      { minigrid_siteId: minigrid_siteId },
      { page: 1, limit: 1 }
    );

    return submissions.length > 0 ? submissions[0] : null;
  }

  async canUserSubmit(formId: string, userId?: string): Promise<boolean> {
    if (!userId) {
      // For anonymous users, check if form allows anonymous submissions
      const form = await this.findById(formId);
      return form.isAnonymous;
    }

    const existingSubmission = await this.getUserSubmission(formId, userId);
    return existingSubmission === null;
  }

  async getFormSubmissions(
    formId: string,
    filters?: Record<string, any>,
    pagination?: { page: number; limit: number },
    populate
  ): Promise<any[]> {
    const form = await this.findById(formId);

    if (!form.tableName) {
      throw new Error('Form has no submission table');
    }

    return this.repo.getFormSubmissions(formId, filters, pagination, populate);
  }

  async getSubmissionById(formId: string, submissionId: string): Promise<any> {
    const submissions = await this.repo.getFormSubmissions(
      formId,
      { id: submissionId },
      { page: 1, limit: 1 }
    );

    if (submissions.length === 0) {
      throw new Error('Submission not found');
    }

    return submissions[0];
  }
  async getSubmissionByMinigridSiteId(formId: string, siteId: string): Promise<any> {
    const submissions = await this.repo.getFormSubmissions(
      formId,
      { minigrid_siteId: siteId },
      { page: 1, limit: 1 }
    );

    console.log(formId, siteId, submissions, "this is the paramasnsnns")

    if (submissions.length === 0) {
      throw new Error('Submission not found');
    }

    return submissions[0];
  }
  async getSubmission(formId: string, submissionId: string): Promise<any> {
    const submissions = await this.repo.getFormSubmissions(
      formId,
      { id: submissionId },
      { page: 1, limit: 1 }
    );

    if (submissions.length === 0) {
      throw new Error('Submission not found');
    }

    return submissions[0];
  }

  async updateSubmission(
    formId: string,
    submissionId: string,
    updates: Record<string, any>,
    userId?: string
  ): Promise<any> {
    console.log(updates, 'this updates');
    const form = await this.findById(formId);
    const submission = await this.getSubmissionById(formId, submissionId);

    // Check ownership if userId provided
    if (userId && submission.submitted_by !== userId) {
      throw new Error('You can only update your own submissions');
    }

    // Validate update data
    const validationResult = await this.validateSubmissionData(form, updates);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    const updatedSubmission = {
      ...validationResult.processedData,
      minigrid_siteId: updates?.minigrid_siteId,
    };

    console.log(updatedSubmission);

    // Update submission through repository
    return this.repo.updateSubmission(formId, submissionId, updatedSubmission);
  }

  async deleteSubmission(formId: string, submissionId: string, userId?: string): Promise<void> {
    const submission = await this.getSubmissionById(formId, submissionId);

    // Check ownership if userId provided
    if (userId && submission.submitted_by !== userId) {
      throw new Error('You can only delete your own submissions');
    }

    // Delete through repository
    await this.repo.deleteSubmission(formId, submissionId);
  }

  async updateSubmissionStatus(
    formId: string,
    submissionId: string,
    status: string,
    reviewerId?: string,
    reason?: string
  ): Promise<any> {
    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new Error(`Invalid status: ${status}`);
    }

    const updateData = {
      status: status.toUpperCase(),
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      review_reason: reason,
    };

    return this.repo.updateSubmission(formId, submissionId, updateData);
  }

  /* ============================================================================ */
  /* Analytics & Reporting                                                        */
  /* ============================================================================ */

  async getFormAnalytics(formId: string): Promise<any> {
    const form = await this.findById(formId);

    if (!form.tableName) {
      return {
        totalSubmissions: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        submissionsByDate: [],
        topCountries: [],
        statusDistribution: {},
      };
    }

    const totalSubmissions = await this.getSubmissionCount(formId);

    // Calculate analytics
    return {
      totalSubmissions,
      totalViews: form.totalViews,
      completionRate: form.totalViews > 0 ? (totalSubmissions / form.totalViews) * 100 : 0,
      averageCompletionTime: form.averageCompletionTime,
      lastSubmissionAt: form.lastSubmissionAt,
      submissionsByDate: await this.getSubmissionsByDate(formId),
      mostCommonAnswers: await this.getMostCommonAnswers(formId),
      submissionStatus: await this.getSubmissionStatusDistribution(formId),
    };
  }

  async exportSubmissionsCSV(formId: string): Promise<string> {
    const submissions = await this.repo.getFormSubmissions(formId);

    if (submissions.length === 0) {
      return 'No submissions found';
    }

    // Convert to CSV
    const headers = Object.keys(submissions[0]);
    const csvRows = [headers.join(',')];

    submissions.forEach(submission => {
      const values = headers.map(header => {
        const value = submission[header];
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  async exportSubmissionsExcel(formId: string): Promise<Buffer> {
    const submissions = await this.repo.getFormSubmissions(formId);
console.log(submissions, "exce; sss")
    if (submissions.length === 0) {
      // Create empty workbook with headers
      const form = await this.findById(formId);
      const headers = this.getFormHeaders(form);
      const worksheet = XLSX.utils.aoa_to_sheet([headers]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    // Create worksheet from submissions
    const worksheet = XLSX.utils.json_to_sheet(submissions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

    // Add form metadata sheet
    const form = await this.findById(formId);
    const metadataSheet = XLSX.utils.json_to_sheet([
      {
        'Form Title': form.title,
        'Form Type': form.formType,
        Status: form.status,
        'Total Submissions': submissions.length,
        'Created At': form.createdAt,
        'Last Updated': form.updatedAt,
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Form Info');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async getSubmissionStats(formId: string): Promise<any> {
    const form = await this.findById(formId);

    return {
      totalSubmissions: await this.getSubmissionCount(formId),
      pendingApproval: await this.getSubmissionCountByStatus(formId, 'PENDING'),
      approved: await this.getSubmissionCountByStatus(formId, 'APPROVED'),
      rejected: await this.getSubmissionCountByStatus(formId, 'REJECTED'),
      averageResponsesPerDay: await this.getAverageResponsesPerDay(formId),
      peakSubmissionHour: await this.getPeakSubmissionHour(formId),
    };
  }

  /* ============================================================================ */
  /* Templates & Versioning                                                       */
  /* ============================================================================ */

  async saveAsTemplate(formId: string, templateName: string): Promise<Form> {
    const form = await this.findById(formId);

    const templateDto: CreateFormDto = {
      title: templateName,
      slug: `${form.slug}-template-${Date.now()}`,
      description: `Template: ${form.description}`,
      formType: form.formType,
      adminId: form.adminId,
      categories: form.categories.map(cat => ({
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        questions: cat.questions.map(q => ({
          kpi: q.kpi,
          slug: q.slug,
          description: q.description,
          type: q.type,
          required: q.required,
          sortOrder: q.sortOrder,
          options: { ...q.options },
        })),
      })),
    };

    const template = await this.create(templateDto);

    // Mark as template
    const updateDto: UpdateFormDto = {
      id: template.id,
      isTemplate: true,
    };

    return this.repo.updateForm(updateDto);
  }

  async createFromTemplate(
    templateId: string,
    title: string,
    slug: string,
    adminId: string
  ): Promise<Form> {
    const template = await this.findById(templateId);

    if (!template.isTemplate) {
      throw new Error('Form is not a template');
    }

    return this.cloneForm(templateId, title, slug, adminId);
  }

  async getFormVersions(formId: string): Promise<Form[]> {
    // Get all forms that have this form as parent or are children of this form
    const form = await this.findById(formId);

    // Find all versions by looking for forms with same parentId or this form's parentId
    const rootParentId = form.parentId || formId;

    const versions = await this.repo.getFormVersions(rootParentId);

    // Sort by creation date
    return versions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async createFormVersion(formId: string, version: string, adminId: string): Promise<Form> {
    const form = await this.findById(formId);

    // Create new version
    const versionSlug = `${form.slug}-v${version}-${Date.now()}`;
    const versionTitle = `${form.title} v${version}`;

    return this.cloneForm(formId, versionTitle, versionSlug, adminId);
  }

  /* ============================================================================ */
  /* Bulk Operations                                                              */
  /* ============================================================================ */

  async bulkDeleteSubmissions(formId: string, submissionIds: string[]): Promise<void> {
    if (submissionIds.length === 0) {
      throw new Error('No submission IDs provided');
    }

    // Validate all submissions exist
    for (const submissionId of submissionIds) {
      await this.getSubmissionById(formId, submissionId);
    }

    // Delete all submissions
    await this.repo.bulkDeleteSubmissions(formId, submissionIds);
  }

  async bulkUpdateSubmissionStatus(
    formId: string,
    submissionIds: string[],
    status: string,
    reviewerId?: string
  ): Promise<void> {
    if (submissionIds.length === 0) {
      throw new Error('No submission IDs provided');
    }

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new Error(`Invalid status: ${status}`);
    }

    // Validate all submissions exist
    for (const submissionId of submissionIds) {
      await this.getSubmissionById(formId, submissionId);
    }

    const updateData = {
      status: status.toUpperCase(),
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
    };

    await this.repo.bulkUpdateSubmissionStatus(
      formId,
      submissionIds,
      updateData?.status,
      updateData?.reviewed_by
    );
  }

  async bulkExportSubmissionsCSV(formId: string, submissionIds: string[]): Promise<string> {
    if (submissionIds.length === 0) {
      return 'No submission IDs provided';
    }

    const submissions = await this.repo.getFormSubmissions(formId, {
      id: { $in: submissionIds },
    });

    if (submissions.length === 0) {
      return 'No submissions found';
    }

    // Convert to CSV
    const headers = Object.keys(submissions[0]);
    const csvRows = [headers.join(',')];

    submissions.forEach(submission => {
      const values = headers.map(header => {
        const value = submission[header];
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  async bulkExportSubmissionsExcel(formId: string, submissionIds: string[]): Promise<Buffer> {
    if (submissionIds.length === 0) {
      throw new Error('No submission IDs provided');
    }

    const submissions = await this.repo.getFormSubmissions(formId, {
      id: { $in: submissionIds },
    });

    if (submissions.length === 0) {
      throw new Error('No submissions found');
    }

    // Create worksheet from submissions
    const worksheet = XLSX.utils.json_to_sheet(submissions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Submissions');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /* ============================================================================ */
  /* Form Preview & Testing                                                       */
  /* ============================================================================ */

  async getFormPreview(formId: string): Promise<any> {
    const form = await this.findById(formId);

    return {
      form,
      renderableStructure: this.buildRenderableStructure(form),
      validationRules: this.buildValidationRules(form),
    };
  }

  async testFormSubmission(formId: string, testData: Record<string, any>): Promise<any> {
    const form = await this.findById(formId);

    // Validate without saving
    const validationResults = await this.validateSubmissionData(form, testData);

    return {
      valid: validationResults.isValid,
      errors: validationResults.errors,
      processedData: validationResults.processedData,
    };
  }

  /* ============================================================================ */
  /* Form Health & Monitoring                                                     */
  /* ============================================================================ */

  async checkFormHealth(formId: string): Promise<any> {
    const form = await this.findById(formId);

    return {
      formId,
      status: form.status,
      tableExists: form.tableCreated,
      tableName: form.tableName,
      schemaVersion: form.lastMigrationVersion,
      submissionCount: await this.getSubmissionCount(formId),
      lastSubmission: form.lastSubmissionAt,
      issues: await this.detectFormIssues(form),
    };
  }

  async repairFormTable(formId: string): Promise<any> {
    try {
      // Attempt to repair the form table through repository
      const form = await this.repo.repairFormTable(formId);

      return {
        formId,
        status: 'REPAIRED',
        tableExists: form.tableCreated,
        tableName: form.tableName,
        schemaVersion: form.lastMigrationVersion,
        submissionCount: await this.getSubmissionCount(formId),
        lastSubmission: form.lastSubmissionAt,
        repairedAt: new Date(),
      };
    } catch (error: any) {
      return {
        formId,
        status: 'REPAIR_FAILED',
        error: error.message,
        repairedAt: new Date(),
      };
    }
  }

  /* ============================================================================ */
  /* Helper & Validation Methods                                                  */
  /* ============================================================================ */

  private async validateFormDto(dto: CreateFormDto): Promise<void> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error('Form title is required');
    }

    if (!dto.slug || dto.slug.trim().length === 0) {
      throw new Error('Form slug is required');
    }

    await this.validateSlugUniqueness(dto.slug);
  }

  private async validateSlugUniqueness(slug: string): Promise<void> {
    try {
      await this.findBySlug(slug);
      throw new Error('Slug already exists');
    } catch (error: any) {
      if (error.message === 'Form not found') {
        // Slug is unique, this is what we want
        return;
      }
      throw error;
    }
  }

  private async validateFormForPublishing(form: Form): Promise<void> {
    if (form.categories.length === 0) {
      throw new Error('Form must have at least one category');
    }

    const hasQuestions = form.categories.some(cat => cat.questions.length > 0);
    if (!hasQuestions) {
      throw new Error('Form must have at least one question');
    }
  }

  private async validateQuestionDto(questionDto: any): Promise<void> {
    const validTypes = [
      'text',
      'textarea',
      'number',
      'currency',
      'date',
      'datetime',
      'boolean',
      'select',
      'multiselect',
      'file',
      'email',
      'phone',
      'url',
    ];

    if (!validTypes.includes(questionDto.type)) {
      throw new Error(`Invalid question type: ${questionDto.type}`);
    }

    if (questionDto.type === 'select' || questionDto.type === 'multiselect') {
      if (!questionDto.options?.options || !Array.isArray(questionDto.options.options)) {
        throw new Error('Select and multiselect questions must have options array');
      }
    }
  }

  private async validateSubmissionData(form: Form, data: Record<string, any>): Promise<any> {
    const errors: string[] = [];
    const processedData: Record<string, any> = {};

    // Validate each question
    for (const category of form.categories) {
      for (const question of category.questions) {
        const value = data[question.slug];

        // Check required fields
        if (question.required && (value === undefined || value === null || value === '')) {
          errors.push(`${question.kpi} is required`);
          continue;
        }

        // Type validation
        if (value !== undefined && value !== null && value !== '') {
          const validationResult = this.validateQuestionValue(question, value);
          if (!validationResult.valid) {
            errors.push(`${question.kpi}: ${validationResult.error}`);
          } else {
            processedData[question.slug] = validationResult.value;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      processedData,
    };
  }

  private validateQuestionValue(
    question: Question,
    value: any
  ): { valid: boolean; error?: string; value?: any } {
    switch (question.type) {
      case 'number':
      case 'currency':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, error: 'Must be a valid number' };
        }
        return { valid: true, value: numValue };

      case 'date':
      case 'datetime':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return { valid: false, error: 'Must be a valid date' };
        }
        return { valid: true, value: dateValue };

      case 'boolean':
        return { valid: true, value: Boolean(value) };

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'Must be a valid email address' };
        }
        return { valid: true, value };

      case 'select':
        const options = question.options?.options || [];
        if (!options.includes(value)) {
          return { valid: false, error: 'Invalid option selected' };
        }
        return { valid: true, value };

      case 'multiselect':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Must be an array of options' };
        }
        const validOptions = question.options?.options || [];
        const invalidSelections = value.filter(v => !validOptions.includes(v));
        if (invalidSelections.length > 0) {
          return { valid: false, error: 'Invalid options selected' };
        }
        return { valid: true, value };

      default:
        return { valid: true, value: String(value) };
    }
  }

  private buildRenderableStructure(form: Form): any {
    return {
      id: form.id,
      title: form.title,
      description: form.description,
      categories: form.categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        questions: category.questions.map(question => ({
          id: question.id,
          kpi: question.kpi,
          slug: question.slug,
          type: question.type,
          required: question.required,
          options: question.options,
          description: question.description,
        })),
      })),
    };
  }

  private buildValidationRules(form: Form): any {
    const rules: Record<string, any> = {};

    form.categories.forEach(category => {
      category.questions.forEach(question => {
        rules[question.slug] = {
          required: question.required,
          type: question.type,
          options: question.options,
        };
      });
    });

    return rules;
  }

  private async validateStructureChanges(
    existingForm: Form,
    updates: UpdateFormDto
  ): Promise<void> {
    // Check if removing required questions that might have data
    if (updates.categories && existingForm.tableCreated) {
      const submissionCount = await this.getSubmissionCount(existingForm.id);
      if (submissionCount > 0) {
        throw new Error(
          'Cannot modify form structure with existing submissions. Create a new version instead.'
        );
      }
    }
  }

  private async detectFormIssues(form: Form): Promise<string[]> {
    const issues: string[] = [];

    if (form.status === FormStatus.PUBLISHED && !form.tableCreated) {
      issues.push('Published form has no submission table');
    }

    if (form.categories.length === 0) {
      issues.push('Form has no categories');
    }

    const hasQuestions = form.categories.some(cat => cat.questions.length > 0);
    if (!hasQuestions) {
      issues.push('Form has no questions');
    }

    // Check for duplicate question slugs within form
    const questionSlugs = form.categories.flatMap(cat => cat.questions.map(q => q.slug));
    const duplicateSlugs = questionSlugs.filter(
      (slug, index) => questionSlugs.indexOf(slug) !== index
    );
    if (duplicateSlugs.length > 0) {
      issues.push(`Duplicate question slugs found: ${[...new Set(duplicateSlugs)].join(', ')}`);
    }

    // Check for empty categories
    const emptyCategories = form.categories.filter(cat => cat.questions.length === 0);
    if (emptyCategories.length > 0) {
      issues.push(`Empty categories found: ${emptyCategories.map(cat => cat.name).join(', ')}`);
    }

    return issues;
  }

  private getFormHeaders(form: Form): string[] {
    const headers = ['id', 'submitted_at', 'submitted_by', 'status'];

    // Add question headers
    form.categories.forEach(category => {
      category.questions.forEach(question => {
        headers.push(question.slug);
      });
    });

    return headers;
  }

  // Utility methods for statistics
  private async getSubmissionCount(formId: string): Promise<number> {
    const submissions = await this.repo.getFormSubmissions(formId);
    return submissions.length;
  }

  private async getUserSubmissionCount(formId: string, minigridSiteId: string): Promise<number> {
    const submissions = await this.repo.getFormSubmissions(formId, {
      minigrid_siteId: minigridSiteId,
    });
    return submissions.length;
  }

  private async getSubmissionCountByStatus(formId: string, status: string): Promise<number> {
    const submissions = await this.repo.getFormSubmissions(formId, { status });
    return submissions.length;
  }

  private async getSubmissionsByDate(formId: string): Promise<any[]> {
    try {
      const submissions = await this.repo.getFormSubmissions(formId);

      // Group submissions by date
      const groupedByDate: Record<string, number> = {};

      submissions.forEach(submission => {
        const date = new Date(submission.submitted_at).toISOString().split('T')[0];
        groupedByDate[date] = (groupedByDate[date] || 0) + 1;
      });

      // Convert to array format
      return Object.entries(groupedByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error getting submissions by date:', error);
      return [];
    }
  }

  private async getMostCommonAnswers(formId: string): Promise<any> {
    try {
      const submissions = await this.repo.getFormSubmissions(formId);
      const form = await this.findById(formId);

      const commonAnswers: Record<string, Record<string, number>> = {};

      // Initialize structure for each question
      form.categories.forEach(category => {
        category.questions.forEach(question => {
          commonAnswers[question.slug] = {};
        });
      });

      // Count answers
      submissions.forEach(submission => {
        Object.keys(commonAnswers).forEach(questionSlug => {
          const answer = submission[questionSlug];
          if (answer !== null && answer !== undefined && answer !== '') {
            const answerKey = Array.isArray(answer) ? answer.join(', ') : String(answer);
            commonAnswers[questionSlug][answerKey] =
              (commonAnswers[questionSlug][answerKey] || 0) + 1;
          }
        });
      });

      // Get top 5 answers for each question
      const result: Record<string, any[]> = {};
      Object.keys(commonAnswers).forEach(questionSlug => {
        result[questionSlug] = Object.entries(commonAnswers[questionSlug])
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([answer, count]) => ({ answer, count }));
      });

      return result;
    } catch (error) {
      console.error('Error getting most common answers:', error);
      return {};
    }
  }

  private async getSubmissionStatusDistribution(formId: string): Promise<any> {
    try {
      const submissions = await this.repo.getFormSubmissions(formId);

      const statusCounts: Record<string, number> = {};

      submissions.forEach(submission => {
        const status = submission.status || 'PENDING';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      return statusCounts;
    } catch (error) {
      console.error('Error getting submission status distribution:', error);
      return {};
    }
  }

  private async getAverageResponsesPerDay(formId: string): Promise<number> {
    try {
      const submissions = await this.repo.getFormSubmissions(formId);

      if (submissions.length === 0) return 0;

      // Get date range
      const dates = submissions.map(s => new Date(s.submitted_at));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Calculate days difference
      const timeDiff = maxDate.getTime() - minDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 1;

      return Math.round((submissions.length / daysDiff) * 100) / 100;
    } catch (error) {
      console.error('Error calculating average responses per day:', error);
      return 0;
    }
  }

  private async getPeakSubmissionHour(formId: string): Promise<number> {
    try {
      const submissions = await this.repo.getFormSubmissions(formId);

      if (submissions.length === 0) return 12; // Default to noon

      // Count submissions by hour
      const hourCounts: Record<number, number> = {};

      submissions.forEach(submission => {
        const hour = new Date(submission.submitted_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      // Find peak hour
      let peakHour = 12;
      let maxCount = 0;

      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          peakHour = parseInt(hour);
        }
      });

      return peakHour;
    } catch (error) {
      console.error('Error getting peak submission hour:', error);
      return 12;
    }
  }

  /* ============================================================================ */
  /* Additional Helper Methods                                                    */
  /* ============================================================================ */

  async getFormMetrics(formId: string): Promise<any> {
    const form = await this.findById(formId);
    const submissions = await this.repo.getFormSubmissions(formId);

    return {
      form: {
        id: form.id,
        title: form.title,
        status: form.status,
        createdAt: form.createdAt,
      },
      metrics: {
        totalQuestions: form.categories.reduce((sum, cat) => sum + cat.questions.length, 0),
        totalCategories: form.categories.length,
        totalSubmissions: submissions.length,
        completionRate: form.totalViews > 0 ? (submissions.length / form.totalViews) * 100 : 0,
        averageCompletionTime: form.averageCompletionTime || 0,
      },
      recentActivity: {
        lastSubmission: form.lastSubmissionAt,
        submissionsToday: await this.getSubmissionsToday(formId),
        submissionsThisWeek: await this.getSubmissionsThisWeek(formId),
        submissionsThisMonth: await this.getSubmissionsThisMonth(formId),
      },
    };
  }

  private async getSubmissionsToday(formId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const submissions = await this.repo.getFormSubmissions(formId, {
      submitted_at: { $gte: today },
    });

    return submissions.length;
  }

  private async getSubmissionsThisWeek(formId: string): Promise<number> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const submissions = await this.repo.getFormSubmissions(formId, {
      submitted_at: { $gte: weekStart },
    });

    return submissions.length;
  }

  private async getSubmissionsThisMonth(formId: string): Promise<number> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const submissions = await this.repo.getFormSubmissions(formId, {
      submitted_at: { $gte: monthStart },
    });

    return submissions.length;
  }

  async validateFormIntegrity(formId: string): Promise<any> {
    const form = await this.findById(formId);
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check form structure
    if (!form.title || form.title.trim().length === 0) {
      issues.push('Form has no title');
    }

    if (!form.slug || form.slug.trim().length === 0) {
      issues.push('Form has no slug');
    }

    // Check categories
    if (form.categories.length === 0) {
      issues.push('Form has no categories');
    }

    form.categories.forEach((category, categoryIndex) => {
      if (!category.name || category.name.trim().length === 0) {
        issues.push(`Category ${categoryIndex + 1} has no name`);
      }

      if (category.questions.length === 0) {
        warnings.push(`Category "${category.name}" has no questions`);
      }

      // Check questions
      category.questions.forEach((question, questionIndex) => {
        if (!question.kpi || question.kpi.trim().length === 0) {
          issues.push(`Question ${questionIndex + 1} in category "${category.name}" has no KPI`);
        }

        if (!question.slug || question.slug.trim().length === 0) {
          issues.push(`Question ${questionIndex + 1} in category "${category.name}" has no slug`);
        }

        if (!question.type) {
          issues.push(`Question "${question.kpi}" has no type`);
        }

        // Check select/multiselect options
        if (question.type === 'select' || question.type === 'multiselect') {
          if (!question.options?.options || !Array.isArray(question.options.options)) {
            issues.push(`Question "${question.kpi}" requires options array`);
          } else if (question.options.options.length === 0) {
            warnings.push(`Question "${question.kpi}" has no options`);
          }
        }
      });
    });

    // Check for duplicate slugs
    const questionSlugs = form.categories.flatMap(cat => cat.questions.map(q => q.slug));
    const duplicateSlugs = questionSlugs.filter(
      (slug, index) => questionSlugs.indexOf(slug) !== index
    );
    if (duplicateSlugs.length > 0) {
      issues.push(`Duplicate question slugs: ${[...new Set(duplicateSlugs)].join(', ')}`);
    }

    const categorySlugs = form.categories.map(cat => cat.slug);
    const duplicateCategorySlugs = categorySlugs.filter(
      (slug, index) => categorySlugs.indexOf(slug) !== index
    );
    if (duplicateCategorySlugs.length > 0) {
      issues.push(`Duplicate category slugs: ${[...new Set(duplicateCategorySlugs)].join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      summary: {
        totalCategories: form.categories.length,
        totalQuestions: questionSlugs.length,
        issueCount: issues.length,
        warningCount: warnings.length,
      },
    };
  }
}
