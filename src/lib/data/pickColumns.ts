/** Selects a subset of columns from a row, preserving raw values - used to build drilldown/summary table rows straight off a parsed CSV row with no computation. */
export function pickColumns(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of columns) out[column] = row[column];
  return out;
}
