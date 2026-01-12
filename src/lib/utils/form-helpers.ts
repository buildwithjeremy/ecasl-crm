// ==========================================
// Form Helper Utilities
// ==========================================

/**
 * Calculate new end time based on start time and duration
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [startH, startM] = startTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = (startMinutes + durationMinutes) % (24 * 60);
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

/**
 * Calculate job duration in minutes from start and end time
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return endMinutes >= startMinutes 
    ? endMinutes - startMinutes 
    : (24 * 60 - startMinutes) + endMinutes;
}

/**
 * Check if job duration is valid (2-8 hours)
 */
export function isValidJobDuration(startTime: string, endTime: string): boolean {
  const duration = calculateDurationMinutes(startTime, endTime);
  return duration >= 120 && duration <= 480;
}

/**
 * Clamp duration to valid range and return adjusted end time
 */
export function clampDuration(startTime: string, endTime: string): string {
  const durationMinutes = calculateDurationMinutes(startTime, endTime);
  
  if (durationMinutes >= 120 && durationMinutes <= 480) {
    return endTime; // Already valid
  }
  
  // Clamp to valid range
  const clampedDuration = Math.max(120, Math.min(480, durationMinutes));
  return calculateEndTime(startTime, clampedDuration);
}

/**
 * Format a date string for display
 */
export function formatDateForDisplay(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a time string for display (12-hour format)
 */
export function formatTimeForDisplay(timeString: string | null | undefined): string {
  if (!timeString) return '-';
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  } catch {
    return timeString;
  }
}
