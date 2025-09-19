import { FormType, FormTypeStatus } from '../../../database/entities/form-type.entity';

export interface FormTypeQuery {
  page?: number;
  limit?: number;
  year?: number;
  status?: FormTypeStatus;
  isPublic?: boolean;
  isDefault?: boolean;
  search?: string;
}

export interface FormTypeCreateData {
  name: string;
  slug?: string;
  description?: string;
  year: number;
  status?: FormTypeStatus;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isPublic?: boolean;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export interface FormTypeUpdateData extends Partial<FormTypeCreateData> {}

export interface FormTypeStatistics {
  total: number;
  active: number;
  inactive: number;
  archived: number;
}

export interface FormTypePaginatedResult {
  formTypes: FormType[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SortOrderUpdate {
  id: string;
  sortOrder: number;
}

export interface IFormTypeRepository {
  /**
   * Create a new form type
   * @param formTypeData - The form type data to create
   * @returns Promise<FormType>
   */
  create(formTypeData: Partial<FormType>): Promise<FormType>;

  /**
   * Save a form type (create or update)
   * @param formType - The form type entity to save
   * @returns Promise<FormType>
   */
  save(formType: FormType): Promise<FormType>;

  /**
   * Find a form type by ID
   * @param id - The form type ID
   * @returns Promise<FormType | null>
   */
  findById(id: string): Promise<FormType | null>;

  /**
   * Find a form type by slug
   * @param slug - The form type slug
   * @returns Promise<FormType | null>
   */
  findBySlug(slug: string): Promise<FormType | null>;

  /**
   * Find a form type by name and year
   * @param name - The form type name
   * @param year - The year
   * @returns Promise<FormType | null>
   */
  findByNameAndYear(name: string, year: number): Promise<FormType | null>;

  /**
   * Find a form type by name and year excluding a specific ID
   * @param name - The form type name
   * @param year - The year
   * @param excludeId - The ID to exclude from search
   * @returns Promise<FormType | null>
   */
  findByNameAndYearExcludingId(
    name: string,
    year: number,
    excludeId: string
  ): Promise<FormType | null>;

  /**
   * Find all form types with filters and pagination
   * @param query - The query parameters
   * @returns Promise<[FormType[], number]> - Array of form types and total count
   */
  findAllWithFilters(query: FormTypeQuery): Promise<[FormType[], number]>;

  /**
   * Find all active and public form types
   * @param year - Optional year filter
   * @returns Promise<FormType[]>
   */
  findActiveAndPublic(year?: number): Promise<FormType[]>;

  /**
   * Find all form types for a specific year
   * @param year - The year to filter by
   * @returns Promise<FormType[]>
   */
  findByYear(year: number): Promise<FormType[]>;

  /**
   * Find all form types by status
   * @param status - The status to filter by
   * @returns Promise<FormType[]>
   */
  findByStatus(status: FormTypeStatus): Promise<FormType[]>;

  /**
   * Find default form types for a specific year
   * @param year - The year to filter by
   * @returns Promise<FormType[]>
   */
  findDefaultTypes(year: number): Promise<FormType[]>;

  /**
   * Update a form type by ID
   * @param id - The form type ID
   * @param updateData - The data to update
   * @returns Promise<FormType>
   */
  update(id: string, updateData: Partial<FormType>): Promise<FormType>;

  /**
   * Delete a form type
   * @param formType - The form type entity to delete
   * @returns Promise<void>
   */
  delete(formType: FormType): Promise<void>;

  /**
   * Delete a form type by ID
   * @param id - The form type ID
   * @returns Promise<void>
   */
  deleteById(id: string): Promise<void>;

  /**
   * Bulk update sort order for multiple form types
   * @param updates - Array of ID and sort order updates
   * @returns Promise<void>
   */
  bulkUpdateSortOrder(updates: SortOrderUpdate[]): Promise<void>;

  /**
   * Count total form types
   * @returns Promise<number>
   */
  count(): Promise<number>;

  /**
   * Count form types by status
   * @param status - The status to count
   * @returns Promise<number>
   */
  countByStatus(status: FormTypeStatus): Promise<number>;

  /**
   * Count form types by year
   * @param year - The year to count
   * @returns Promise<number>
   */
  countByYear(year: number): Promise<number>;

  /**
   * Get form type statistics
   * @returns Promise<FormTypeStatistics>
   */
  getStatistics(): Promise<FormTypeStatistics>;

  /**
   * Check if a form type exists by name and year
   * @param name - The form type name
   * @param year - The year
   * @returns Promise<boolean>
   */
  existsByNameAndYear(name: string, year: number): Promise<boolean>;

  /**
   * Check if a form type exists by slug
   * @param slug - The form type slug
   * @returns Promise<boolean>
   */
  existsBySlug(slug: string): Promise<boolean>;

  /**
   * Find form types with forms count
   * @returns Promise<FormType[]>
   */
  findWithFormsCount(): Promise<FormType[]>;

  /**
   * Find unused form types (form types with no associated forms)
   * @returns Promise<FormType[]>
   */
  findUnusedFormTypes(): Promise<FormType[]>;

  /**
   * Archive old form types by year
   * @param beforeYear - Archive form types before this year
   * @returns Promise<number> - Number of archived form types
   */
  archiveOldFormTypes(beforeYear: number): Promise<number>;

  /**
   * Reorder form types by updating sort order
   * @param orderedIds - Array of form type IDs in desired order
   * @returns Promise<void>
   */
  reorderFormTypes(orderedIds: string[]): Promise<void>;

  /**
   * Search form types by name or description
   * @param searchTerm - The search term
   * @param limit - Optional limit for results
   * @returns Promise<FormType[]>
   */
  searchFormTypes(searchTerm: string, limit?: number): Promise<FormType[]>;

  /**
   * Get form types for dropdown/select options
   * @param year - Optional year filter
   * @param activeOnly - Whether to return only active form types
   * @returns Promise<Array<{ id: string; name: string; slug: string; color?: string; icon?: string }>>
   */
  getFormTypeOptions(
    year?: number,
    activeOnly?: boolean
  ): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      color?: string;
      icon?: string;
    }>
  >;
}
