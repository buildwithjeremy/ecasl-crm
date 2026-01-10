// Simple US state to timezone mapping
const stateTimezones: Record<string, string> = {
  // Eastern Time
  CT: 'America/New_York',
  DE: 'America/New_York',
  DC: 'America/New_York',
  FL: 'America/New_York', // Most of FL
  GA: 'America/New_York',
  IN: 'America/Indiana/Indianapolis', // Most of IN
  KY: 'America/New_York', // Eastern KY
  ME: 'America/New_York',
  MD: 'America/New_York',
  MA: 'America/New_York',
  MI: 'America/Detroit',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NY: 'America/New_York',
  NC: 'America/New_York',
  OH: 'America/New_York',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  VT: 'America/New_York',
  VA: 'America/New_York',
  WV: 'America/New_York',
  
  // Central Time
  AL: 'America/Chicago',
  AR: 'America/Chicago',
  IL: 'America/Chicago',
  IA: 'America/Chicago',
  KS: 'America/Chicago', // Most of KS
  LA: 'America/Chicago',
  MN: 'America/Chicago',
  MS: 'America/Chicago',
  MO: 'America/Chicago',
  NE: 'America/Chicago', // Most of NE
  ND: 'America/Chicago', // Most of ND
  OK: 'America/Chicago',
  SD: 'America/Chicago', // Most of SD
  TN: 'America/Chicago', // Most of TN
  TX: 'America/Chicago', // Most of TX
  WI: 'America/Chicago',
  
  // Mountain Time
  AZ: 'America/Phoenix', // No DST
  CO: 'America/Denver',
  ID: 'America/Boise', // Most of ID
  MT: 'America/Denver',
  NM: 'America/Denver',
  UT: 'America/Denver',
  WY: 'America/Denver',
  
  // Pacific Time
  CA: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  OR: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',
  
  // Alaska Time
  AK: 'America/Anchorage',
  
  // Hawaii-Aleutian Time
  HI: 'America/Honolulu',
  
  // US Territories
  PR: 'America/Puerto_Rico',
  VI: 'America/Virgin',
  GU: 'Pacific/Guam',
  AS: 'Pacific/Pago_Pago',
  MP: 'Pacific/Guam',
};

// Friendly display names for timezones
const timezoneDisplayNames: Record<string, string> = {
  'America/New_York': 'Eastern Time (ET)',
  'America/Indiana/Indianapolis': 'Eastern Time (ET)',
  'America/Detroit': 'Eastern Time (ET)',
  'America/Chicago': 'Central Time (CT)',
  'America/Denver': 'Mountain Time (MT)',
  'America/Boise': 'Mountain Time (MT)',
  'America/Phoenix': 'Arizona Time (MST - No DST)',
  'America/Los_Angeles': 'Pacific Time (PT)',
  'America/Anchorage': 'Alaska Time (AKT)',
  'America/Honolulu': 'Hawaii Time (HT)',
  'America/Puerto_Rico': 'Atlantic Time (AT)',
  'America/Virgin': 'Atlantic Time (AT)',
  'Pacific/Guam': 'Chamorro Time (ChST)',
  'Pacific/Pago_Pago': 'Samoa Time (SST)',
};

// Timezone options for dropdown selection
// Note: Some states have split time zones (FL, IN, KY, TN, TX, KS, NE, ND, SD, ID, OR, NV)
// Users in border areas should manually verify and adjust the timezone
export const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST - No DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'America/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic Time (AT)' },
  { value: 'Pacific/Guam', label: 'Chamorro Time (ChST)' },
  { value: 'Pacific/Pago_Pago', label: 'Samoa Time (SST)' },
] as const;

export function getTimezoneFromState(stateCode: string | undefined | null): string | null {
  if (!stateCode) return null;
  const normalized = stateCode.trim().toUpperCase();
  return stateTimezones[normalized] || null;
}

export function getTimezoneDisplayName(timezone: string | undefined | null): string {
  if (!timezone) return '';
  return timezoneDisplayNames[timezone] || timezone;
}
