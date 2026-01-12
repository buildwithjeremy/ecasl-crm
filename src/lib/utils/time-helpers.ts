/**
 * Time normalization and validation helpers for job scheduling
 */

/**
 * Normalize time from various formats to "HH:MM" for Select compatibility
 * Handles: "HH:MM:SS", "HH:MM:SS.sss", "HH:MM", or any other format
 * Returns empty string for null/undefined/invalid input
 */
export function normalizeTimeToHHMM(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return '';
  
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // Match HH:MM at the start, ignore anything after (like :SS or .sss)
  const match = trimmed.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

/**
 * Check if a time value is in the correct HH:MM format for Select
 */
export function isValidTimeFormat(time: string | null | undefined): boolean {
  if (!time) return false;
  return /^\d{2}:\d{2}$/.test(time);
}

/**
 * Check if a time needs normalization (has seconds or other suffix)
 */
export function needsTimeNormalization(time: string | null | undefined): boolean {
  if (!time) return false;
  // If it's longer than HH:MM (5 chars) and starts with valid time, it needs normalization
  return time.length > 5 && /^\d{2}:\d{2}/.test(time);
}
