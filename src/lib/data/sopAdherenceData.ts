/**
 * Data loading + wiring layer for the SOP Adherence Metrics tab. Reuses the
 * same batch CSVs and computed KPI values as Executive Story (via
 * loadCoreDataset + computeKpiSummary) rather than re-deriving them, and adds
 * the handful of computations genuinely specific to this tab.
 */
import {
  computeCallsProcessed,
  computeFrequentNonAdherenceFull,
  computeKpiSummary,
  computeSequenceAdherenceDetail,
  computeSopAreaFull,
  getSopOnlyCallList,
  type FrequentNonAdherenceRow,
  type KpiSummary,
  type SequenceSummaryRow,
  type SopAreaSummaryRow,
} from '../calculations/executiveStoryCalculations';
import { loadCoreDataset } from './coreDataset';
import { pickColumns } from './pickColumns';
import type { SopDrilldownRow } from './executiveStoryData';

export interface SopAdherenceData {
  kpiSummary: KpiSummary;
  callsProcessed: number;
  callLevelSummary: SopDrilldownRow[];
  sopAreaFull: SopAreaSummaryRow[];
  frequentNonAdherenceFull: FrequentNonAdherenceRow[];
  sequenceAdherenceDetail: SequenceSummaryRow[];
  sopOnlyCallIds: string[];
}

/**
 * The "Call-Level SOP Adherence Summary" column set - deliberately a
 * 10-column SUBSET of Executive Story's 12-column SOP Adherence Drilldown
 * (drops Survey Completion Status and Follow-up Next Step Mentioned), per
 * this tab's spec. Reuses SopDrilldownRow/SopDrilldownTable rather than a
 * parallel type - the table component takes a `columns` allow-list to render
 * only these.
 */
export const SOP_CALL_LEVEL_SUMMARY_COLUMNS: string[] = [
  'call_id',
  'agent',
  'call_type',
  'sop_call_type',
  'sop_file',
  'sop_coverage_pct',
  'purpose_context_explained',
  'consent_availability_checked',
  'proper_closure_detected',
];

/**
 * Raw source fields to copy from each CSV row into the SopDrilldownRow-shaped
 * object. Distinct from SOP_CALL_LEVEL_SUMMARY_COLUMNS (the UI column allow-
 * list) because the merged 'agent' column key has no matching raw field -
 * it derives from agent_id/agent_name instead.
 */
const SOP_CALL_LEVEL_SUMMARY_SOURCE_FIELDS: string[] = [
  'call_id',
  'agent_id',
  'agent_name',
  'call_type',
  'sop_call_type',
  'sop_file',
  'sop_coverage_pct',
  'purpose_context_explained',
  'consent_availability_checked',
  'proper_closure_detected',
];

export async function loadSopAdherenceData(): Promise<SopAdherenceData> {
  const { sopRows, qualityRows, timingRows, itemLevelRowsByCallId } = await loadCoreDataset();

  const kpiSummary = computeKpiSummary(sopRows, qualityRows, timingRows, itemLevelRowsByCallId);
  const callsProcessed = computeCallsProcessed(sopRows);
  const sopAreaFull = computeSopAreaFull(sopRows, itemLevelRowsByCallId);
  const frequentNonAdherenceFull = computeFrequentNonAdherenceFull(sopRows, itemLevelRowsByCallId);
  const sequenceAdherenceDetail = computeSequenceAdherenceDetail(sopRows, itemLevelRowsByCallId);
  const sopOnlyCallIds = getSopOnlyCallList(sopRows);

  const callLevelSummary = sopRows.map(
    (row) => pickColumns(row, SOP_CALL_LEVEL_SUMMARY_SOURCE_FIELDS) as unknown as SopDrilldownRow,
  );

  return {
    kpiSummary,
    callsProcessed,
    callLevelSummary,
    sopAreaFull,
    frequentNonAdherenceFull,
    sequenceAdherenceDetail,
    sopOnlyCallIds,
  };
}
