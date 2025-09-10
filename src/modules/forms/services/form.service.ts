// src/forms/services/FormService.ts
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
      const existingSubmission = await this.getUserSubmissionCount(dto.formId, dto.submittedBy);
      if (existingSubmission > 0) {
        throw new Error('Multiple submissions not allowed for this form');
      }
    }

    return this.repo.submitFormData(dto.formId, dto.data, dto.submittedBy);
  }

  async getFormSubmissions(
    formId: string,
    filters?: Record<string, any>,
    pagination?: { page: number; limit: number }
  ): Promise<any[]> {
    const form = await this.findById(formId);

    if (!form.tableName) {
      throw new Error('Form has no submission table');
    }

    return this.repo.getFormSubmissions(formId, filters, pagination);
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

  async updateSubmission(
    formId: string,
    submissionId: string,
    updates: Record<string, any>,
    userId?: string
  ): Promise<any> {
    const form = await this.findById(formId);
    const submission = await this.getSubmissionById(formId, submissionId);

    // Check ownership if userId provided
    if (userId && submission.submitted_by !== userId) {
      throw new Error('You can only update your own submissions');
    }

    // Validate update data
    await this.validateSubmissionData(form, updates);

    // Implementation would depend on your database approach
    // This is a simplified version
    throw new Error('Submission updates not yet implemented');
  }

  async deleteSubmission(formId: string, submissionId: string, userId?: string): Promise<void> {
    const submission = await this.getSubmissionById(formId, submissionId);

    // Check ownership if userId provided
    if (userId && submission.submitted_by !== userId) {
      throw new Error('You can only delete your own submissions');
    }

    // Implementation would depend on your database approach
    throw new Error('Submission deletion not yet implemented');
  }

  async updateSubmissionStatus(
    formId: string,
    submissionId: string,
    status: string,
    reviewerId?: string,
    reason?: string
  ): Promise<any> {
    // Implementation for approval/rejection workflow
    throw new Error('Submission status updates not yet implemented');
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
    // Implementation would use a library like xlsx
    throw new Error('Excel export not yet implemented');
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
      slug: `${form.slug}-template`,
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

    // @ts-ignore
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
    // Implementation would fetch all forms with parentId = formId
    throw new Error('Form versioning not yet implemented');
  }

  async createFormVersion(formId: string, version: string, adminId: string): Promise<Form> {
    const form = await this.findById(formId);

    // Create new version
    const versionSlug = `${form.slug}-v${version}`;
    return this.cloneForm(formId, `${form.title} v${version}`, versionSlug, adminId);
  }

  /* ============================================================================ */
  /* Bulk Operations                                                              */
  /* ============================================================================ */

  async bulkDeleteSubmissions(formId: string, submissionIds: string[]): Promise<void> {
    // Implementation for bulk operations
    throw new Error('Bulk operations not yet implemented');
  }

  async bulkUpdateSubmissionStatus(
    formId: string,
    submissionIds: string[],
    status: string,
    reviewerId?: string
  ): Promise<void> {
    throw new Error('Bulk operations not yet implemented');
  }

  async bulkExportSubmissionsCSV(formId: string, submissionIds: string[]): Promise<string> {
    throw new Error('Bulk operations not yet implemented');
  }

  async bulkExportSubmissionsExcel(formId: string, submissionIds: string[]): Promise<Buffer> {
    throw new Error('Bulk operations not yet implemented');
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
    // Implementation for table repair
    throw new Error('Table repair not yet implemented');
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

    return issues;
  }

  // Utility methods for statistics
  private async getSubmissionCount(formId: string): Promise<number> {
    const submissions = await this.repo.getFormSubmissions(formId);
    return submissions.length;
  }

  private async getUserSubmissionCount(formId: string, userId: string): Promise<number> {
    const submissions = await this.repo.getFormSubmissions(formId, { submitted_by: userId });
    return submissions.length;
  }

  private async getSubmissionCountByStatus(formId: string, status: string): Promise<number> {
    const submissions = await this.repo.getFormSubmissions(formId, { status });
    return submissions.length;
  }

  private async getSubmissionsByDate(formId: string): Promise<any[]> {
    // Implementation would group submissions by date
    return [];
  }

  private async getMostCommonAnswers(formId: string): Promise<any> {
    // Implementation would analyze common answers
    return {};
  }

  private async getSubmissionStatusDistribution(formId: string): Promise<any> {
    // Implementation would group by status
    return {};
  }

  private async getAverageResponsesPerDay(formId: string): Promise<number> {
    // Implementation would calculate average
    return 0;
  }

  private async getPeakSubmissionHour(formId: string): Promise<number> {
    // Implementation would find peak hour
    return 12;
  }
}
