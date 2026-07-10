/**
 * Shared batch-CSV + eager item-level loading, factored out of
 * executiveStoryData.ts so the SOP Adherence Metrics tab can reuse the exact
 * same computed values (computeKpiSummary etc.) instead of re-fetching and
 * re-deriving them independently. Each page still calls this once on its own
 * mount - there's no cross-page caching, just no duplicated fetch/assembly
 * logic between the two loaders.
 */
import type { ProcessingTimeRow, QualitySummaryRow, SopItemRow, SopSummaryRow } from '../calculations/executiveStoryCalculations';
import { fetchCsv, fetchCsvOrEmpty } from './csv';
import { batchPaths, itemLevelLatestPath } from './paths';

export interface CoreDataset {
  sopRows: SopSummaryRow[];
  qualityRows: QualitySummaryRow[];
  timingRows: ProcessingTimeRow[];
  itemLevelRowsByCallId: Map<string, SopItemRow[]>;
}

export function sortedUnionCallIds(sopRows: SopSummaryRow[], qualityRows: QualitySummaryRow[]): string[] {
  const ids = new Set<string>();
  for (const row of sopRows) if (row.call_id) ids.add(String(row.call_id));
  for (const row of qualityRows) if (row.call_id) ids.add(String(row.call_id));
  return [...ids].sort();
}

export async function loadCoreDataset(): Promise<CoreDataset> {
  const [sopRows, qualityRows, timingRows] = await Promise.all([
    fetchCsv<SopSummaryRow>(batchPaths.sopSummary),
    fetchCsv<QualitySummaryRow>(batchPaths.qualitySummary),
    fetchCsv<ProcessingTimeRow>(batchPaths.processingTime),
  ]);

  const callIds = sortedUnionCallIds(sopRows, qualityRows);

  // Eagerly fetched (not lazily, unlike the other per-call files): several
  // KPIs (Opening/Middle/Closure SOP Adherence, Avg Sequence Followed, Most
  // Non-Adherence Area, Most Frequent Missed SOP, and this dataset's SOP
  // Area/Recurring-Non-Adherence/Sequence tables) can only be computed from
  // real per-call item-level rows. With only ~10 calls in this dataset the
  // total payload is small, so this trades a strict "lazy per-call fetch"
  // reading of the brief for KPI tiles that show real numbers instead of
  // "NA" on tab load - confirmed with the user for Executive Story, and this
  // SOP tab needs the same item-level rows for the same reason.
  const itemLevelEntries = await Promise.all(
    callIds.map(async (callId): Promise<[string, SopItemRow[]]> => [
      callId,
      await fetchCsvOrEmpty<SopItemRow>(itemLevelLatestPath(callId, 'sop_items')),
    ]),
  );
  const itemLevelRowsByCallId = new Map(itemLevelEntries);

  return { sopRows, qualityRows, timingRows, itemLevelRowsByCallId };
}
