import { FormSubmissionScope } from '../../database/entities/form.entity';

export class CreateFormDto {
  title!: string;
  slug!: string;
  questions?: CreateQuestionDto[];
  submissionScope?: FormSubmissionScope;
  allowOnlyOneSubmissionPerScope?: boolean;
  requireAllScopesSubmission?: boolean;
}
export class UpdateFormDto {
  id!: string;
  title?: string;
  slug?: string;
  questions?: CreateQuestionDto[];
}

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'file'
  | 'email'
  | 'phone'
  | 'url';

export interface CreateQuestionDto {
  kpi: string;
  slug: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  sortOrder?: number;
  options?: Record<string, any>; // For select options, validation rules, etc.
}

export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {
  id: string;
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  sortOrder?: number;
  questions?: CreateQuestionDto[];
}

// @ts-ignore

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  id: string;
  questions?: (CreateQuestionDto | UpdateQuestionDto)[];
}

export interface CreateFormDto {
  title: string;
  slug: string;
  description?: string;
  formType?: string;
  status?: import('../../database/entities/form.entity').FormStatus;
  adminId: string;
  parentId?: string;
  categories?: CreateCategoryDto[];
}

// @ts-ignore

export interface UpdateFormDto extends Partial<CreateFormDto> {
  id: string;
  isTemplate?: boolean;
  categories?: (CreateCategoryDto | UpdateCategoryDto)[];
}

export interface QuestionResponseDto {
  id: string;
  kpi: string;
  slug: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  sortOrder: number;
  options: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  questions: QuestionResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FormResponseDto {
  id: string;
  title: string;
  slug: string;
  description?: string;
  formType: string;
  status: string;
  version: string;
  tableName?: string;
  tableCreated: boolean;
  publishedAt?: Date;
  dateStarted: Date;
  adminId: string;
  parentId?: string;
  categories: CategoryResponseDto[];
  admin?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Form submission DTOs
export interface FormSubmissionDto {
  formId: string;
  submittedBy?: string;
  data: Record<string, any>; // Dynamic form data based on questions
}

export interface FormSubmissionResponseDto {
  id: string;
  formId: string;
  submittedBy?: string;
  submittedAt: Date;
  status: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Query DTOs
export interface FormQueryDto {
  page?: number;
  limit?: number;
  status?: string;
  formType?: string;
  adminId?: string;
  search?: string;
}

export interface SubmissionQueryDto {
  page?: number;
  limit?: number;
  submittedBy?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  filters?: Record<string, any>;
}

// Seed data types (for your existing seed data)
export interface FormSeedData {
  title: string;
  slug: string;
  description?: string;
  formType?: string;
  categories: CategorySeedData[];
}

export interface CategorySeedData {
  name: string;
  slug: string;
  sortOrder?: number;
  questions: QuestionSeedData[];
}

export interface QuestionSeedData {
  kpi: string;
  slug: string;
  required: boolean;
  type: QuestionType;
  sortOrder?: number;
  options?: Record<string, any>;
  description?: string;
}
