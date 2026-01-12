// ==========================================
// Job Time and Billing Calculations
// ==========================================

export interface HoursSplit {
  businessHours: number;
  afterHours: number;
  totalHours: number;
  billableHours: number;
  minimumApplied: number;
  hoursType: 'business' | 'after' | 'mixed';
}

/**
 * Calculate hours split between business (8am-5pm) and after-hours
 */
export function calculateHoursSplit(
  startTime: string, 
  endTime: string, 
  minimumHours: number = 2
): HoursSplit {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  // Handle overnight jobs
  const totalMinutes = endMinutes >= startMinutes 
    ? endMinutes - startMinutes 
    : (24 * 60 - startMinutes) + endMinutes;
  
  const totalHours = totalMinutes / 60;
  
  // Business hours: 8am (480 min) to 5pm (1020 min)
  const businessStart = 8 * 60; // 8:00 AM
  const businessEnd = 17 * 60;  // 5:00 PM
  
  let businessMinutes = 0;
  let afterMinutes = 0;
  
  // Iterate through each minute of the job
  for (let i = 0; i < totalMinutes; i++) {
    const currentMinute = (startMinutes + i) % (24 * 60);
    if (currentMinute >= businessStart && currentMinute < businessEnd) {
      businessMinutes++;
    } else {
      afterMinutes++;
    }
  }
  
  const businessHours = businessMinutes / 60;
  const afterHours = afterMinutes / 60;
  
  // Apply minimum hours - any shortfall is added to business hours
  const billableHours = Math.max(totalHours, minimumHours);
  const minimumApplied = billableHours > totalHours ? billableHours - totalHours : 0;
  
  // Determine hours type
  let hoursType: 'business' | 'after' | 'mixed' = 'mixed';
  if (afterMinutes === 0) {
    hoursType = 'business';
  } else if (businessMinutes === 0) {
    hoursType = 'after';
  }
  
  return {
    businessHours: businessHours + minimumApplied,
    afterHours,
    totalHours,
    billableHours,
    minimumApplied,
    hoursType,
  };
}

/**
 * Format duration as "Xh Ym"
 */
export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Calculate job duration in hours from start and end time
 */
export function calculateJobDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const duration = endMinutes >= startMinutes 
    ? endMinutes - startMinutes 
    : (24 * 60 - startMinutes) + endMinutes;
  return duration / 60; // hours
}

/**
 * Generate 15-minute time increments for time selectors
 */
export function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour24 = h.toString().padStart(2, '0');
      const min = m.toString().padStart(2, '0');
      const value = `${hour24}:${min}`;
      
      // Format for display (12-hour with AM/PM)
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${min} ${ampm}`;
      
      options.push({ value, label });
    }
  }
  return options;
}

/**
 * Generate duration options (2h to 8h in 15-min increments)
 */
export function generateDurationOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  // 2 hours to 8 hours in 15-minute increments
  for (let minutes = 120; minutes <= 480; minutes += 15) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const label = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
    options.push({ value: minutes, label });
  }
  return options;
}

// Pre-generated options for performance
export const TIME_OPTIONS = generateTimeOptions();
export const DURATION_OPTIONS = generateDurationOptions();

// ==========================================
// Billing Calculations
// ==========================================

export interface BillableTotal {
  // Facility totals
  facilityBusinessTotal: number;
  facilityAfterHoursTotal: number;
  facilityMileageTotal: number;
  facilityFeesTotal: number;
  facilityTotal: number;
  facilityBusinessRate: number;
  facilityAfterHoursRate: number;
  facilityMileageRate: number;
  facilityRateAdjustment: number;
  
  // Interpreter totals
  interpreterBusinessTotal: number;
  interpreterAfterHoursTotal: number;
  interpreterMileageTotal: number;
  interpreterTravelTimeTotal: number;
  interpreterFeesTotal: number;
  interpreterTotal: number;
  interpreterBusinessRate: number;
  interpreterAfterHoursRate: number;
  interpreterMileageRate: number;
  interpreterTravelTimeRate: number;
  interpreterRateAdjustment: number;
  
  // Expense breakdown
  mileage: number;
  travelTimeHours: number;
  parking: number;
  tolls: number;
  miscFee: number;
}

export interface BillableCalculationInputs {
  hoursSplit: HoursSplit;
  facilityBusinessRate: number;
  facilityAfterHoursRate: number;
  facilityMileageRate: number;
  facilityRateAdjustment: number;
  interpreterBusinessRate: number;
  interpreterAfterHoursRate: number;
  interpreterMileageRate: number;
  interpreterRateAdjustment: number;
  mileage: number;
  travelTimeHours: number;
  parking: number;
  tolls: number;
  miscFee: number;
}

/**
 * Calculate complete billable totals for a job
 */
export function calculateBillableTotal(inputs: BillableCalculationInputs): BillableTotal {
  const {
    hoursSplit,
    facilityBusinessRate,
    facilityAfterHoursRate,
    facilityMileageRate,
    facilityRateAdjustment,
    interpreterBusinessRate,
    interpreterAfterHoursRate,
    interpreterMileageRate,
    interpreterRateAdjustment,
    mileage,
    travelTimeHours,
    parking,
    tolls,
    miscFee,
  } = inputs;

  // Apply rate adjustments to hourly rates
  const adjustedFacilityBusinessRate = facilityBusinessRate + facilityRateAdjustment;
  const adjustedFacilityAfterHoursRate = facilityAfterHoursRate + facilityRateAdjustment;
  const adjustedInterpreterBusinessRate = interpreterBusinessRate + interpreterRateAdjustment;
  const adjustedInterpreterAfterHoursRate = interpreterAfterHoursRate + interpreterRateAdjustment;

  // Determine travel time rate based on which hour type has more hours
  const interpreterTravelTimeRate = hoursSplit.businessHours >= hoursSplit.afterHours 
    ? adjustedInterpreterBusinessRate 
    : adjustedInterpreterAfterHoursRate;

  // Facility calculations
  const facilityBusinessTotal = hoursSplit.businessHours * adjustedFacilityBusinessRate;
  const facilityAfterHoursTotal = hoursSplit.afterHours * adjustedFacilityAfterHoursRate;
  const facilityMileageTotal = mileage * facilityMileageRate;
  const facilityFeesTotal = parking + tolls + miscFee;

  // Interpreter calculations
  const interpreterBusinessTotal = hoursSplit.businessHours * adjustedInterpreterBusinessRate;
  const interpreterAfterHoursTotal = hoursSplit.afterHours * adjustedInterpreterAfterHoursRate;
  const interpreterMileageTotal = mileage * interpreterMileageRate;
  const interpreterTravelTimeTotal = travelTimeHours * interpreterTravelTimeRate;
  const interpreterFeesTotal = parking + tolls + miscFee;

  return {
    facilityBusinessTotal,
    facilityAfterHoursTotal,
    facilityMileageTotal,
    facilityMileageRate,
    facilityFeesTotal,
    facilityTotal: facilityBusinessTotal + facilityAfterHoursTotal + facilityMileageTotal + facilityFeesTotal,
    facilityBusinessRate: adjustedFacilityBusinessRate,
    facilityAfterHoursRate: adjustedFacilityAfterHoursRate,
    facilityRateAdjustment,
    interpreterBusinessTotal,
    interpreterAfterHoursTotal,
    interpreterMileageTotal,
    interpreterMileageRate,
    interpreterTravelTimeTotal,
    interpreterTravelTimeRate,
    interpreterFeesTotal,
    interpreterTotal: interpreterBusinessTotal + interpreterAfterHoursTotal + interpreterMileageTotal + interpreterTravelTimeTotal + interpreterFeesTotal,
    interpreterBusinessRate: adjustedInterpreterBusinessRate,
    interpreterAfterHoursRate: adjustedInterpreterAfterHoursRate,
    interpreterRateAdjustment,
    mileage,
    travelTimeHours,
    parking,
    tolls,
    miscFee,
  };
}

// ==========================================
// Utility Helpers
// ==========================================

/**
 * Convert value to safe number (handle empty strings, undefined, NaN)
 */
export function toSafeNumber(val: unknown, fallback: number = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

/**
 * Check if a value was explicitly provided (not empty/undefined)
 */
export function hasValue(val: unknown): boolean {
  return val !== undefined && val !== null && val !== '' && !isNaN(Number(val));
}

/**
 * Format currency
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `$${value.toFixed(2)}`;
}
