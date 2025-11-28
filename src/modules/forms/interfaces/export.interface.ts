export interface IExportRepository {
  getFormSubmissionsByFormType(
    formTypeId: string,
    year?: number,
    memberId?: string,
    siteId?: string
  ): Promise<any[]>;
  
  getFormSubmissionsByMember(
    memberId: string,
    year?: any,
    formTypeId?: string
  ): Promise<any[]>;
  
  getFormSubmissionsBySite(
    siteId: string,
    year?: number,
    formTypeId?: string
  ): Promise<any[]>;
  
  getAllFormSubmissions(
    year?: number,
    formTypeId?: string,
    memberId?: string,
    siteId?: string
  ): Promise<any[]>;
  
  getFormTypesByYear(year?: number): Promise<any[]>;
  
  getMembersByStatus(status?: string): Promise<any[]>;
  
  getSitesByMember(memberId?: string): Promise<any[]>;
}

export enum ExportType {
  FORM_TYPE_CURRENT = 'FORM_TYPE_CURRENT',
  FORM_TYPE_YEARLY = 'FORM_TYPE_YEARLY',
  ALL_FORM_TYPES_ALL_YEARS = 'ALL_FORM_TYPES_ALL_YEARS',
  MEMBER_SUBMISSIONS_ALL = 'MEMBER_SUBMISSIONS_ALL',
  MEMBER_SUBMISSIONS_YEARLY = 'MEMBER_SUBMISSIONS_YEARLY',
  SITE_SUBMISSIONS_ALL = 'SITE_SUBMISSIONS_ALL',
  SITE_SUBMISSIONS_YEARLY = 'SITE_SUBMISSIONS_YEARLY',
  CUSTOM_FILTERED = 'CUSTOM_FILTERED'
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
  PDF = 'pdf'
}

export interface ExportFilters {
  formTypeId?: string;
  year?: any;
  memberId?: string;
  siteId?: string;
  submissionStatus?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  filePath: string;
  format: ExportFormat;
  recordCount: number;
  fileSize: number;
  exportedAt: Date;
  exportedBy: string;
  filters: ExportFilters;
}

export interface ExportSummary {
  totalRecords: number;
  exportType: ExportType;
  filters: ExportFilters;
  formTypes: string[];
  memberCount: number;
  siteCount: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}