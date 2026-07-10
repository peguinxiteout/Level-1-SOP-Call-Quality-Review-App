/**
 * Data loading + wiring layer for the Executive Story tab. Fetches the batch
 * CSVs once, feeds them into the ported calculation module
 * (executiveStoryCalculations.ts) and assembles the drilldown tables the UI
 * renders. No calculation logic lives here - only fetch/parse/select.
 */
import {
  computeKpiSummary,
  computePriorityCalls,
  type KpiSummary,
  type PriorityCallRow,
  type QualitySummaryRow,
  type SopSummaryRow,
} from '../calculations/executiveStoryCalculations';
import { fetchCsv } from './csv';
import { batchPaths } from './paths';
import { loadCoreDataset, sortedUnionCallIds } from './coreDataset';
import { pickColumns } from './pickColumns';

export interface ExecutiveSignalRow {
  area: string;
  insight: string;
  [column: string]: unknown;
}

export interface SopDrilldownRow {
  call_id: string;
  agent_id?: string;
  agent_name?: string;
  call_type?: string;
  sop_call_type?: string;
  sop_file?: string;
  sop_coverage_pct?: number | string;
  purpose_context_explained?: string;
  consent_availability_checked?: string;
  survey_completion_status?: string;
  proper_closure_detected?: string;
  followup_next_step_mentioned?: string;
}

export interface AgentDrilldownRow {
  call_id: string;
  agent_id?: string;
  agent_name?: string;
  call_type?: string;
  agent_talk_ratio_pct?: number | string;
  agent_talk_ratio_band?: string;
  silence_ratio_pct?: number | string;
  silence_ratio_band?: string;
  agent_talkover_rate_pct?: number | string;
  agent_talkover_rate_band?: string;
  customer_talkover_rate_pct?: number | string;
  customer_talkover_rate_band?: string;
  agent_wpm?: number | string;
  agent_wpm_band?: string;
  long_agent_turn_count?: number | string;
  customer_experience_concern_call_flag?: string;
  audio_metrics_available?: string;
}

export interface ExecutiveStoryData {
  kpiSummary: KpiSummary;
  priorityCalls: PriorityCallRow[];
  signals: ExecutiveSignalRow[];
  sopDrilldown: SopDrilldownRow[];
  agentDrilldown: AgentDrilldownRow[];
  callIds: string[];
  sopRows: SopSummaryRow[];
  qualityRows: QualitySummaryRow[];
}

const SOP_DRILLDOWN_COLUMNS: string[] = [
  'call_id',
  'agent_id',
  'agent_name',
  'call_type',
  'sop_call_type',
  'sop_file',
  'sop_coverage_pct',
  'purpose_context_explained',
  'consent_availability_checked',
  'survey_completion_status',
  'proper_closure_detected',
  'followup_next_step_mentioned',
];

const AGENT_DRILLDOWN_COLUMNS: string[] = [
  'call_id',
  'agent_id',
  'agent_name',
  'call_type',
  'agent_talk_ratio_pct',
  'agent_talk_ratio_band',
  'silence_ratio_pct',
  'silence_ratio_band',
  'agent_talkover_rate_pct',
  'agent_talkover_rate_band',
  'customer_talkover_rate_pct',
  'customer_talkover_rate_band',
  'agent_wpm',
  'agent_wpm_band',
  'long_agent_turn_count',
  'customer_experience_concern_call_flag',
  'audio_metrics_available',
];

export async function loadExecutiveStoryData(): Promise<ExecutiveStoryData> {
  const [{ sopRows, qualityRows, timingRows, itemLevelRowsByCallId }, signalRows] = await Promise.all([
    loadCoreDataset(),
    fetchCsv<ExecutiveSignalRow>(batchPaths.executiveSignals),
  ]);

  const callIds = sortedUnionCallIds(sopRows, qualityRows);

  const kpiSummary = computeKpiSummary(sopRows, qualityRows, timingRows, itemLevelRowsByCallId);
  const priorityCalls = computePriorityCalls(sopRows, qualityRows, timingRows);

  const sopDrilldown = sopRows.map((row) => pickColumns(row, SOP_DRILLDOWN_COLUMNS) as unknown as SopDrilldownRow);
  const agentDrilldown = qualityRows.map((row) => pickColumns(row, AGENT_DRILLDOWN_COLUMNS) as unknown as AgentDrilldownRow);

  return {
    kpiSummary,
    priorityCalls,
    signals: signalRows,
    sopDrilldown,
    agentDrilldown,
    callIds,
    sopRows,
    qualityRows,
  };
}
