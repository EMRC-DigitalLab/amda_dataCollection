// parsers/data-sheet-parser.ts - Parse data sheets to extract form structure and site data

import * as XLSX from 'xlsx';
import {
  DataSheet,
  CategoryData,
  QuestionData,
  ColumnMapping,
  SiteDataRow,
  InstructionsData,
} from '../types';
import { EXCEL_CONFIG } from '../config';
import { generateSlug, generateCamelCaseSlug } from '../utils/slug-generator';
import { inferQuestionType, inferQuestionOptions, inferRequired } from './type-inference';
import { sheetToArray } from './excel-parser';
import { logger } from '../utils/logger';

/**
 * Parse a data sheet to extract form structure and site data
 */
export function parseDataSheet(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  instructions: InstructionsData
): DataSheet {
  logger.debug(`Parsing data sheet: ${sheetName}`);

  const rows = sheetToArray(sheet);

  if (rows.length < EXCEL_CONFIG.DATA_START_ROW + 1) {
    throw new Error(`Sheet ${sheetName} has insufficient rows`);
  }

  // Extract metadata rows
  const categoryRow = rows[EXCEL_CONFIG.METADATA_ROWS.CATEGORY];
  const kpiRow = rows[EXCEL_CONFIG.METADATA_ROWS.KPI];
  const descriptionRow = rows[EXCEL_CONFIG.METADATA_ROWS.DESCRIPTION];
  const unitsRow = rows[EXCEL_CONFIG.METADATA_ROWS.UNITS];

  // Find matching form type from instructions
  const formTypeName = findMatchingFormType(sheetName, instructions);
  logger.debug(`Matched form type: ${formTypeName}`);

  // Build column mappings (skip column 0 which is metadata)
  const columnMappings: ColumnMapping[] = [];
  let currentCategory = '';

  for (let colIndex = 1; colIndex < kpiRow.length; colIndex++) {
    const category = categoryRow[colIndex];
    const kpi = kpiRow[colIndex];
    const description = descriptionRow[colIndex];
    const units = unitsRow[colIndex];

    // Skip empty columns
    if (!kpi || typeof kpi !== 'string' || kpi.trim() === '') continue;

    // Update current category if specified
    if (category && typeof category === 'string' && category.trim() !== '') {
      currentCategory = category.trim();
    }

    // Infer question type from units
    const questionType = inferQuestionType(units);

    const mapping: ColumnMapping = {
      columnIndex: colIndex,
      category: currentCategory || 'General',
      kpi: kpi.trim(),
      slug: generateCamelCaseSlug(kpi),
      description: description?.toString().trim() || '',
      units: units?.toString().trim() || '',
      type: questionType,
    };

    columnMappings.push(mapping);
  }

  logger.debug(`Parsed ${columnMappings.length} columns`);

  // Group columns into categories with questions
  const categories = groupIntoCategories(columnMappings);
  logger.debug(`Organized into ${categories.length} categories`);

  // Extract site data rows
  const dataRows: SiteDataRow[] = [];
  for (let rowIndex = EXCEL_CONFIG.DATA_START_ROW; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // Column 1 contains site name
    const siteName = row[1];
    if (!siteName || typeof siteName !== 'string' || siteName.trim() === '') {
      // Empty row, skip
      continue;
    }

    // Extract data for all columns
    const data: Record<string, any> = {};
    for (const mapping of columnMappings) {
      const value = row[mapping.columnIndex];
      data[mapping.slug] = value !== null && value !== undefined ? value : null;
    }

    dataRows.push({
      rowIndex,
      siteName: siteName.trim(),
      data,
    });
  }

  logger.debug(`Extracted ${dataRows.length} site data rows`);

  return {
    sheetName,
    formTypeName,
    categories,
    dataRows,
    columnMappings,
  };
}

/**
 * Group column mappings into categories with questions
 */
function groupIntoCategories(columnMappings: ColumnMapping[]): CategoryData[] {
  const categoryMap = new Map<string, CategoryData>();
  const usedSlugs = new Set<string>();

  columnMappings.forEach((mapping, _index) => {
    const categoryName = mapping.category;

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        name: categoryName,
        slug: generateSlug(categoryName),
        sortOrder: categoryMap.size + 1,
        questions: [],
      });
    }

    const category = categoryMap.get(categoryName)!;

    // Make slug unique
    let slug = mapping.slug;
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${mapping.slug}${counter}`;
      counter++;
    }
    usedSlugs.add(slug);

    const question: QuestionData = {
      kpi: mapping.kpi,
      slug: slug,
      description: mapping.description,
      type: mapping.type,
      units: mapping.units,
      required: inferRequired(mapping.kpi, mapping.description),
      sortOrder: category.questions.length + 1,
      columnIndex: mapping.columnIndex,
      options: inferQuestionOptions(mapping.type, mapping.units, mapping.description),
    };

    category.questions.push(question);
  });

  return Array.from(categoryMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Find matching form type name from instructions
 */
function findMatchingFormType(sheetName: string, instructions: InstructionsData): string {
  const sheetNameLower = sheetName.toLowerCase().replace(/\s+/g, '');

  // Try to find exact match
  for (const section of instructions.sections) {
    const sectionNameLower = section.title.toLowerCase().replace(/\s+/g, '');
    if (sectionNameLower === sheetNameLower) {
      return section.title;
    }
  }

  // Try to find partial match
  for (const section of instructions.sections) {
    const sectionNameLower = section.title.toLowerCase();
    if (
      sectionNameLower.includes(sheetName.toLowerCase()) ||
      sheetName.toLowerCase().includes(sectionNameLower)
    ) {
      return section.title;
    }
  }

  // Default to sheet name if no match found
  logger.warn(`No matching form type found for sheet: ${sheetName}, using sheet name as form type`);
  return sheetName;
}
