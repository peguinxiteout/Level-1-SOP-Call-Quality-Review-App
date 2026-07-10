/** Maps the calc module's band/priority strings to a fixed status token. Never used for series identity - status color only. */
export type StatusTone = 'good' | 'warning' | 'critical' | 'neutral';

const BAND_TONE: Record<string, StatusTone> = {
  Good: 'good',
  Watch: 'warning',
  Review: 'critical',
  'Needs Check': 'critical',
  'Not Available': 'neutral',
};

const PRIORITY_TONE: Record<string, StatusTone> = {
  OK: 'good',
  Medium: 'warning',
  High: 'critical',
};

export function toneForBand(band: unknown): StatusTone {
  return BAND_TONE[String(band ?? '')] ?? 'neutral';
}

export function toneForPriority(priority: unknown): StatusTone {
  return PRIORITY_TONE[String(priority ?? '')] ?? 'neutral';
}

/** For SOP checklist flags, where "Yes" (the step happened) is the desired outcome. */
export function toneForYesNo(value: unknown): StatusTone {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'yes') return 'good';
  if (normalized === 'no') return 'critical';
  if (normalized === 'partial') return 'warning';
  return 'neutral';
}

/** For concern/issue flags, where "Yes" (a concern was found) is the undesired outcome - inverse of toneForYesNo. */
export function toneForConcernFlag(value: unknown): StatusTone {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'yes') return 'warning';
  if (normalized === 'no') return 'good';
  return 'neutral';
}
