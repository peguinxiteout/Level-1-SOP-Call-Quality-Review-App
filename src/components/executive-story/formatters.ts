/** Small display-only formatting helpers shared by the Executive Story tables. */
import { formatPercentValue, type NA } from '../../lib/calculations/executiveStoryCalculations';

const MISSING_LITERALS = new Set(['na', 'n/a']);

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  return MISSING_LITERALS.has(String(value).trim().toLowerCase());
}

export function formatPct(value: unknown): string {
  if (isMissing(value)) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${Math.round(num)}%`;
}

/** Words-per-minute is a rate, not a percentage - round it but never append "%". */
export function formatWpm(value: unknown): string {
  if (isMissing(value)) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${Math.round(num)} wpm`;
}

export function formatCell(value: unknown): string {
  if (isMissing(value)) return '—';
  return String(value);
}

/** Wraps the calc module's formatPercentValue, swapping its "NA" string for the shared "—" placeholder. */
export function formatKpiPercent(value: number | NA): string {
  const formatted = formatPercentValue(value);
  return formatted === 'NA' ? '—' : formatted;
}
