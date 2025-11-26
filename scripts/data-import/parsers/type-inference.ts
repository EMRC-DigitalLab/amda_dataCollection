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
 * Extract dropdown options from description
 * Looks for patterns like: "Select one: A, B, C" or "(Options: A, B, C)"
 */
export function extractDropdownOptions(description: string): string[] | null {
  if (!description) return null;

  // const desc = description.toLowerCase();

  // Pattern 1: "select one: A, B, C" or "choose: A, B, C"
  const pattern1 = /(select|choose|pick)\s+(one|from)?\s*:?\s*([^.]+)/i;
  const match1 = description.match(pattern1);
  if (match1 && match1[3]) {
    const options = match1[3]
      .split(/[,;|]/)
      .map(o => o.trim())
      .filter(o => o.length > 0);
    if (options.length > 1) return options;
  }

  // Pattern 2: "(Options: A, B, C)" or "[A, B, C]"
  const pattern2 = /[([\]](options?:?\s*)?([^)\]]+)[)\]]/i;
  const match2 = description.match(pattern2);
  if (match2 && match2[2]) {
    const options = match2[2]
      .split(/[,;|]/)
      .map(o => o.trim())
      .filter(o => o.length > 0);
    if (options.length > 1) return options;
  }

  // Pattern 3: List with slashes "A / B / C"
  if (description.includes('/')) {
    const options = description
      .split('/')
      .map(o => o.trim())
      .filter(o => o.length > 0 && o.length < 50);
    if (options.length > 1 && options.length < 20) return options;
  }

  return null;
}

/**
 * Infer options for a question based on type, units, and description
 */
export function inferQuestionOptions(
  type: QuestionType,
  units: string | null | undefined,
  description: string | null | undefined
): Record<string, any> {
  const options: Record<string, any> = {
    unit: units?.trim() || 'text',
  };

  // Add placeholder from description
  if (description) {
    options.placeholder = description;
  }

  // Type-specific options
  switch (type) {
    case 'number':
      options.min = 0;
      options.step = 1;
      if (units?.toLowerCase().includes('percent')) {
        options.max = 100;
      }
      break;

    case 'currency':
      options.min = 0;
      options.step = 0.01;
      options.currency = 'USD';
      if (units?.includes('USD')) options.currency = 'USD';
      if (units?.includes('EUR')) options.currency = 'EUR';
      break;

    case 'textarea':
      options.rows = 5;
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
      options.format = 'YYYY-MM-DD';
      break;

    case 'datetime':
      options.format = 'YYYY-MM-DD HH:mm:ss';
      break;

    case 'select':
    case 'multiselect': {
      // Try to extract options from description
      const extractedOptions = extractDropdownOptions(description || '');
      options.options = extractedOptions || ['Option 1', 'Option 2', 'Option 3'];
      if (type === 'multiselect') {
        options.maxSelections = null;
      }
      break;
    }

    case 'boolean':
      options.trueLabel = 'Yes';
      options.falseLabel = 'No';
      break;

    case 'file':
      options.accept = '*/*';
      options.maxSizeMB = 5;
      options.allowMultiple = false;
      break;
  }

  return options;
}

/**
 * Check if a question should be marked as required
 * ALL questions are required by default
 */
export function inferRequired(_kpi: string, _description: string | null | undefined): boolean {
  // ALL questions are required
  return true;
}
