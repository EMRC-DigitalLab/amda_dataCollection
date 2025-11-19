// parsers/type-inference.ts - Infer question types from Units column

import { QuestionType } from '../../../src/shared/types/form.types';
import { UNITS_TO_TYPE_MAPPING } from '../config';
import { logger } from '../utils/logger';

/**
 * Infer question type from units string
 */
export function inferQuestionType(units: string | null | undefined): QuestionType {
  if (!units || typeof units !== 'string') {
    return 'text';
  }

  const unitsLower = units.trim().toLowerCase();

  // Check exact matches first
  for (const [key, type] of Object.entries(UNITS_TO_TYPE_MAPPING)) {
    if (units.trim() === key) {
      return type as QuestionType;
    }
  }

  // Check partial matches
  if (unitsLower.includes('date')) return 'date';
  if (unitsLower.includes('yes') || unitsLower.includes('no')) return 'boolean';
  if (unitsLower.includes('choice') || unitsLower.includes('select')) return 'select';
  if (unitsLower.includes('email')) return 'email';
  if (unitsLower.includes('phone')) return 'phone';
  if (unitsLower.includes('url') || unitsLower.includes('link')) return 'url';
  if (unitsLower.includes('number') || unitsLower.includes('integer')) return 'number';
  if (unitsLower.includes('decimal') || unitsLower.includes('float')) return 'number';
  if (unitsLower.includes('percent') || unitsLower.includes('%')) return 'number';

  // Currency indicators
  if (
    unitsLower.includes('usd') ||
    unitsLower.includes('eur') ||
    unitsLower.includes('$') ||
    unitsLower.includes('€') ||
    unitsLower.includes('currency')
  ) {
    return 'currency';
  }

  // Capacity/measurement units (kW, kWp, kVA, MW, etc.)
  if (/k[wv]p?|mw|mva|kwh|mwh/i.test(units)) {
    return 'number';
  }

  // Default to text
  logger.debug(`Unknown units type: "${units}", defaulting to text`);
  return 'text';
}

/**
 * Infer options for a question based on type and units
 */
export function inferQuestionOptions(
  type: QuestionType,
  units: string | null | undefined,
  description: string | null | undefined
): Record<string, any> {
  const options: Record<string, any> = {};

  // Add placeholder from description
  if (description) {
    options.placeholder = description;
  }

  // Type-specific options
  switch (type) {
    case 'number':
    case 'currency':
      options.min = 0;
      if (units?.toLowerCase().includes('percent')) {
        options.max = 100;
      }
      break;

    case 'textarea':
      options.rows = 4;
      options.maxLength = 2000;
      break;

    case 'text':
      options.maxLength = 500;
      break;

    case 'email':
      options.maxLength = 255;
      break;

    case 'phone':
      options.maxLength = 20;
      break;

    case 'date':
      options.format = 'yyyy-MM-dd';
      break;

    case 'datetime':
      options.format = 'yyyy-MM-dd HH:mm:ss';
      break;
  }

  return options;
}

/**
 * Check if a question should be marked as required
 * (Can be enhanced with more rules later)
 */
export function inferRequired(kpi: string, description: string | null | undefined): boolean {
  // Default to false for now
  // Can be enhanced to check for keywords like "mandatory", "required", etc.
  const mandatoryKeywords = ['required', 'mandatory', 'must'];

  const text = `${kpi} ${description || ''}`.toLowerCase();

  return mandatoryKeywords.some(keyword => text.includes(keyword));
}
