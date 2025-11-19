// config.ts - Pipeline configuration and constants

import { KPIMapping } from './types';

/**
 * Database configuration
 */
export const DATABASE_CONFIG = {
  // Uses existing AppDataSource from your codebase
};

/**
 * Excel parsing configuration
 */
export const EXCEL_CONFIG = {
  INSTRUCTIONS_SHEET_NAME: 'Instructions',
  METADATA_ROWS: {
    CATEGORY: 0,
    KPI: 1,
    DESCRIPTION: 2,
    UNITS: 3,
  },
  DATA_START_ROW: 4,
  METADATA_COLUMN: 0, // Column 0 contains row labels (Category, KPI, Description, Units)
};

/**
 * Default member data for simulation
 */
export const DEFAULT_MEMBER_DATA = {
  primaryContactTitle: 'Chief Executive Officer',
  yearEstablished: '2015',
  headOfficeAddress: '123 Main Street, Business District',
  companyType: 'PRIVATE_LIMITED',
  businessModel: 'UTILITY',
  membershipType: 'FULL_MEMBER',
  website: '',
  city: '',
  state: '',
  postalCode: '',
  countriesOfOperation: '',
  primaryTechnology: 'Solar Hybrid',
  minigridCount: '0',
  totalCapacityInstalled: '0',
  customerConnections: '0',
};

/**
 * KPI to MinigridSite entity field mapping
 * This allows dynamic mapping from Excel KPIs to database fields
 */
export const KPI_TO_MINIGRID_SITE_MAPPING: KPIMapping = {
  // Site Identification
  'Site Name': { entityField: 'name' },
  'Project Name': { entityField: 'name' },
  'Site ID': { entityField: 'name' },

  // Location
  'Country Of Operation': { entityField: 'country' },
  Country: { entityField: 'country' },
  Region: { entityField: 'region' },
  District: { entityField: 'district' },
  Village: { entityField: 'village' },
  Latitude: { entityField: 'lat', transform: v => String(v || '0') },
  Longitude: { entityField: 'lon', transform: v => String(v || '0') },

  // Technical
  'Commissioning Date': {
    entityField: 'commissioningDate',
    transform: v => {
      if (!v) return new Date();
      if (v instanceof Date) return v;
      return new Date(v);
    },
  },
  'Generation Type': { entityField: 'generationType' },
  'Total installed capacity': {
    entityField: 'installedCapacityKw',
    transform: v => String(v || '0'),
  },
  'Installed Capacity': { entityField: 'installedCapacityKw', transform: v => String(v || '0') },
  'Peak Load Capacity': { entityField: 'peakLoadKw', transform: v => String(v || '0') },
  'Peak Load': { entityField: 'peakLoadKw', transform: v => String(v || '0') },

  // Customers
  'Connected Customers': { entityField: 'connectedCustomers', transform: v => String(v || '0') },
  'Total Customers': { entityField: 'connectedCustomers', transform: v => String(v || '0') },
  'Number of Customers': { entityField: 'connectedCustomers', transform: v => String(v || '0') },
  'Residential Customers': {
    entityField: 'customerMixResidential',
    transform: v => String(v || '0'),
  },
  'Commercial Customers': {
    entityField: 'customerMixCommercial',
    transform: v => String(v || '0'),
  },
  'Productive Customers': {
    entityField: 'customerMixProductive',
    transform: v => String(v || '0'),
  },

  // Business
  'Tariff Model': { entityField: 'tariffModel' },
  'License Number': { entityField: 'licenseNo', transform: v => String(v || '0') },
  Developer: { entityField: 'developer' },
};

/**
 * Units to QuestionType mapping
 */
export const UNITS_TO_TYPE_MAPPING: Record<string, string> = {
  // Text types
  Text: 'text',
  String: 'text',

  // Number types
  Number: 'number',
  Integer: 'number',
  Decimal: 'number',
  'Decimal Degrees': 'number',

  // Currency
  USD: 'currency',
  EUR: 'currency',
  $: 'currency',
  '€': 'currency',

  // Date
  Date: 'date',
  'Date (yyyy-mm-dd)': 'date',
  DateTime: 'datetime',

  // Boolean
  'Yes/No': 'boolean',
  'True/False': 'boolean',
  Boolean: 'boolean',

  // Select
  '(Choices)': 'select',
  Dropdown: 'select',

  // Email
  Email: 'email',

  // Phone
  Phone: 'phone',

  // URL
  URL: 'url',
  Link: 'url',

  // Percentage
  '%': 'number',
  Percentage: 'number',

  // Capacity units (treated as numbers)
  kW: 'number',
  kWp: 'number',
  kVA: 'number',
  MW: 'number',
};

/**
 * Default MinigridSite values
 */
export const DEFAULT_SITE_DATA = {
  region: 'Tanzania',
  district: '',
  village: '',
  lat: '0',
  lon: '0',
  status: 'Operational' as const,
  customerMixResidential: '0',
  customerMixCommercial: '0',
  customerMixProductive: '0',
  tariffModel: '',
  licenseNo: '0',
  developer: '',
};

/**
 * Logging configuration
 */
export const LOG_CONFIG = {
  enableConsole: true,
  enableFile: true,
  logFilePath: './logs/data-import.log',
};
