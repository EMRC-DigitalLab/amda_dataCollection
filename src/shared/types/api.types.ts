export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  code?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationErrorResponse {
  success: false;
  message: string;
  errors: ValidationError[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}
