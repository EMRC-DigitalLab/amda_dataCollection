// utils/slug-generator.ts - Generate URL-friendly slugs

/**
 * Generate a slug from a string
 * Converts to lowercase, removes special characters, replaces spaces with hyphens
 */
export function generateSlug(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a number if needed
 */
export function generateUniqueSlug(text: string, existingSlugs: string[]): string {
  const baseSlug = generateSlug(text);
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Generate a camelCase slug from text
 */
export function generateCamelCaseSlug(text: string): string {
  if (!text) return '';

  const words = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .split(/[\s_-]+/);

  if (words.length === 0) return '';

  return (
    words[0] +
    words
      .slice(1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  );
}
