/**
 * Time normalization and validation helpers for job scheduling
 */

/**
 * Normalize time from various formats to "HH:MM" for Select compatibility
 * Handles: "H:MM", "HH:MM", "H:MM:SS", "HH:MM:SS", "HH:MM:SS.sss"
 * Always returns padded "HH:MM" (e.g., "9:00" → "09:00")
 * Returns empty string for null/undefined/invalid input
 */
export function normalizeTimeToHHMM(input: unknown): string {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return '';
  
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // Match H:MM or HH:MM at the start, with optional :SS or :SS.sss suffix
  // Captures: group 1 = hour (1 or 2 digits), group 2 = minutes (2 digits)
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!match) return '';
  
  const hour = match[1].padStart(2, '0');
  const minute = match[2];
  return `${hour}:${minute}`;
}

/**
 * Check if a time value is in the correct HH:MM format for Select
 */
export function isValidTimeFormat(time: string | null | undefined): boolean {
  if (!time) return false;
  return /^\d{2}:\d{2}$/.test(time);
}

/**
 * Check if a time needs normalization (not exactly HH:MM but still time-like)
 */
export function needsTimeNormalization(time: string | null | undefined): boolean {
  if (!time) return false;
  // Already valid HH:MM? No normalization needed
  if (/^\d{2}:\d{2}$/.test(time)) return false;
  // Looks like a time (H:MM or HH:MM with optional suffix)? Needs normalization
  return /^\d{1,2}:\d{2}/.test(time);
}
