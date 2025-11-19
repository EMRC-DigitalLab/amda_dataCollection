// parsers/instructions-parser.ts - Parse Instructions sheet for form type definitions

import * as XLSX from 'xlsx';
import { InstructionsData, FormTypeSection } from '../types';
import { generateSlug } from '../utils/slug-generator';
import { sheetToArray } from './excel-parser';
import { logger } from '../utils/logger';

/**
 * Parse Instructions sheet to extract form type sections
 */
export function parseInstructions(sheet: XLSX.WorkSheet): InstructionsData {
  logger.debug('Parsing Instructions sheet...');

  const rows = sheetToArray(sheet);
  const sections: FormTypeSection[] = [];

  let currentSection: Partial<FormTypeSection> | null = null;
  let descriptionLines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cellValue = row[1]; // Instructions are typically in column B (index 1)

    if (!cellValue || typeof cellValue !== 'string') continue;

    const trimmed = cellValue.trim();

    // Detect section headers (all caps, not starting with number)
    if (isSectionHeader(trimmed)) {
      // Save previous section if exists
      if (currentSection && currentSection.title) {
        sections.push({
          title: currentSection.title,
          description: descriptionLines.join('\n').trim(),
          slug: generateSlug(currentSection.title),
        });
      }

      // Start new section
      currentSection = { title: trimmed };
      descriptionLines = [];
      logger.debug(`Found form type section: ${trimmed}`);
    }
    // Skip "Instructions:" label
    else if (trimmed.toLowerCase() === 'instructions:') {
      continue;
    }
    // Collect description lines
    else if (currentSection && trimmed.length > 0) {
      descriptionLines.push(trimmed);
    }
  }

  // Save last section
  if (currentSection && currentSection.title) {
    sections.push({
      title: currentSection.title,
      description: descriptionLines.join('\n').trim(),
      slug: generateSlug(currentSection.title),
    });
  }

  logger.debug(`Parsed ${sections.length} form type sections`);

  return { sections };
}

/**
 * Determine if a string is a section header
 * Section headers are typically:
 * - All uppercase
 * - Multiple words
 * - Not starting with a number (to avoid "1. Step..." patterns)
 */
function isSectionHeader(text: string): boolean {
  if (!text || text.length < 3) return false;

  // Must be mostly uppercase letters
  const uppercaseRatio =
    (text.match(/[A-Z]/g) || []).length / text.replace(/[^A-Za-z]/g, '').length;
  if (uppercaseRatio < 0.7) return false;

  // Should not start with a number
  if (/^\d/.test(text)) return false;

  // Should have at least 2 words or be a significant single word
  const words = text.split(/\s+/);
  if (words.length === 1 && text.length < 5) return false;

  return true;
}
