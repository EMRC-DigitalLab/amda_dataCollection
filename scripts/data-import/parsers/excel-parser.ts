// parsers/excel-parser.ts - Parse Excel file

import * as XLSX from 'xlsx';
import { ParsedExcelData } from '../types';
import { EXCEL_CONFIG } from '../config';
import { logger } from '../utils/logger';
import { parseInstructions } from './instructions-parser';
import { parseDataSheet } from './data-sheet-parser';

/**
 * Main Excel parser - reads file and orchestrates parsing
 */
export async function parseExcelFile(filePath: string): Promise<ParsedExcelData> {
  logger.section('STEP 1: PARSING EXCEL FILE');
  logger.info(`Reading file: ${filePath}`);

  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  logger.info(`Found ${sheetNames.length} sheets:`, sheetNames);

  // Extract member name from filename
  const memberName = extractMemberName(filePath);
  logger.info(`Extracted member name: ${memberName}`);

  // Extract year (default to current year if not found)
  const year = extractYear(filePath, workbook);
  logger.info(`Using year: ${year}`);

  // Parse Instructions sheet
  const instructionsSheetName = sheetNames.find(
    name => name.toLowerCase() === EXCEL_CONFIG.INSTRUCTIONS_SHEET_NAME.toLowerCase()
  );

  if (!instructionsSheetName) {
    throw new Error(
      `Instructions sheet not found. Looking for: ${EXCEL_CONFIG.INSTRUCTIONS_SHEET_NAME}`
    );
  }

  const instructionsSheet = workbook.Sheets[instructionsSheetName];
  const instructions = parseInstructions(instructionsSheet);
  logger.success(
    `Parsed Instructions sheet: Found ${instructions.sections.length} form type sections`
  );

  // Parse data sheets (all sheets except Instructions)
  const dataSheetNames = sheetNames.filter(
    name => name.toLowerCase() !== EXCEL_CONFIG.INSTRUCTIONS_SHEET_NAME.toLowerCase()
  );

  logger.info(`Parsing ${dataSheetNames.length} data sheets...`);

  const dataSheets = [];
  for (const sheetName of dataSheetNames) {
    try {
      const sheet = workbook.Sheets[sheetName];
      const parsedSheet = parseDataSheet(sheet, sheetName, instructions);
      dataSheets.push(parsedSheet);
      logger.success(`Parsed sheet: ${sheetName} - ${parsedSheet.dataRows.length} sites found`);
    } catch (error: any) {
      logger.error(`Failed to parse sheet: ${sheetName}`, { error: error.message });
      throw error;
    }
  }

  logger.success('Excel file parsing complete!');
  logger.separator();

  return {
    memberName,
    year,
    instructions,
    dataSheets,
  };
}

/**
 * Extract member/company name from filename
 * Example: "Dev_A-_BAM_2024_Data_Collection_Template_.xlsx" -> "Dev A - BAM"
 */
function extractMemberName(filePath: string): string {
  const filename = filePath.split('/').pop() || '';
  const nameWithoutExt = filename.replace(/\.xlsx?$/i, '');

  // Remove common suffixes
  let memberName = nameWithoutExt
    .replace(/_2024|_2025|_Data_Collection_Template_?/gi, '')
    .replace(/_/g, ' ')
    .trim();

  // Clean up multiple spaces
  memberName = memberName.replace(/\s+/g, ' ');

  return memberName || 'Unknown Member';
}

/**
 * Extract year from filename or data
 * Looks for 4-digit year pattern (2020-2099)
 */
function extractYear(filePath: string, _workbook_: XLSX.WorkBook): number {
  const filename = filePath.split('/').pop() || '';
  const yearMatch = filename.match(/20\d{2}/);

  if (yearMatch) {
    return parseInt(yearMatch[0], 10);
  }

  // Default to current year
  return new Date().getFullYear();
}

/**
 * Convert Excel sheet to 2D array for easier processing
 */
export function sheetToArray(sheet: XLSX.WorkSheet): any[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
}
