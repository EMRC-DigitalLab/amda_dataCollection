// types.ts - All TypeScript interfaces and types for the pipeline

import { QuestionType } from '../../src/shared/types/form.types';

/**
 * Parsed Excel file structure
 */
export interface ParsedExcelData {
  memberName: string;
  year: number;
  instructions: InstructionsData;
  dataSheets: DataSheet[];
}

/**
 * Instructions sheet data
 */
export interface InstructionsData {
  sections: FormTypeSection[];
}

export interface FormTypeSection {
  title: string;
  description: string;
  slug: string;
}

/**
 * Data sheet structure
 */
export interface DataSheet {
  sheetName: string;
  formTypeName: string;
  categories: CategoryData[];
  dataRows: SiteDataRow[];
  columnMappings: ColumnMapping[];
}

export interface CategoryData {
  name: string;
  slug: string;
  sortOrder: number;
  questions: QuestionData[];
}

export interface QuestionData {
  kpi: string;
  slug: string;
  description: string;
  type: QuestionType;
  units: string;
  required: boolean;
  sortOrder: number;
  columnIndex: number;
  options: Record<string, any>;
}

export interface ColumnMapping {
  columnIndex: number;
  category: string;
  kpi: string;
  slug: string;
  description: string;
  units: string;
  type: QuestionType;
}

export interface SiteDataRow {
  rowIndex: number;
  siteName: string;
  data: Record<string, any>; // slug -> value
}

/**
 * Member data for creation
 */
export interface MemberCreationData {
  companyName: string;
  email: string;
  registrationNumber: string;
  membershipType: string;
  billingAddress?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  contact1Name?: string;
  contact1Title?: string;
  contact1Email?: string;
  contact1Phone?: string;
}

/**
 * MinigridSite data extracted from row
 */
export interface MinigridSiteData {
  name: string;
  country: string;
  region: string;
  district: string;
  village: string;
  lat: string;
  lon: string;
  commissioningDate: Date | null;
  status: 'Operational' | 'Under Construction' | 'Planned' | 'Maintenance' | 'Decommissioned';
  generationType: string;
  installedCapacityKw: string;
  peakLoadKw: string;
  connectedCustomers: string;
  customerMixResidential: string;
  customerMixCommercial: string;
  customerMixProductive: string;
  tariffModel: string;
  licenseNo: string;
  developer: string;
  memberId: string;
  memberUuid: string;
}

/**
 * Pipeline progress tracking
 */
export interface PipelineProgress {
  membersCreated: number;
  membersUpdated: number;
  formTypesCreated: number;
  formTypesExisting: number;
  formsCreated: number;
  formsPublished: number;
  sitesCreated: number;
  sitesUpdated: number;
  submissionsCreated: number;
  submissionsUpdated: number;
  errors: PipelineError[];
  warnings: string[];
}

export interface PipelineError {
  step: string;
  context: string;
  message: string;
  timestamp: Date;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  filePath: string;
  year?: number;
  skipExisting?: boolean;
  dryRun?: boolean;
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

/**
 * Form Type mapping for KPI matching
 */
export interface KPIMapping {
  [kpi: string]: {
    entityField: keyof MinigridSiteData;
    transform?: (value: any) => any;
  };
}
