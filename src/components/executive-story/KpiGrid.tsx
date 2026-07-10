import type { KpiSummary } from '../../lib/calculations/executiveStoryCalculations';
import { formatKpiPercent } from './formatters';
import TileGrid, { type Tile } from './TileGrid';

function buildTiles(kpi: KpiSummary): Tile[] {
  return [
    { kind: 'stat', label: 'Calls Analyzed', value: String(kpi.callsAnalyzed) },
    { kind: 'stat', label: 'Avg SOP Adherence', value: formatKpiPercent(kpi.avgSopAdherencePct) },
    { kind: 'stat', label: 'Opening SOP Adherence', value: formatKpiPercent(kpi.openingSopAdherencePct) },
    { kind: 'stat', label: 'Middle Section SOP Adherence', value: formatKpiPercent(kpi.middleSectionSopAdherencePct) },
    { kind: 'stat', label: 'Closure SOP Adherence', value: formatKpiPercent(kpi.closureSopAdherencePct) },
    { kind: 'stat', label: 'Avg SOP Sequence Followed', value: formatKpiPercent(kpi.avgSopSequenceFollowedPct) },
    { kind: 'stat', label: 'Calls Having Customer Concerns', value: formatKpiPercent(kpi.callsHavingCustomerConcernsPct) },
    { kind: 'stat', label: 'Avg Agent Talktime', value: formatKpiPercent(kpi.avgAgentTalktimePct) },
    { kind: 'stat', label: 'Avg Agent Silence', value: formatKpiPercent(kpi.avgAgentSilencePct) },
    { kind: 'stat', label: 'Avg Agent Talk-over Rate', value: formatKpiPercent(kpi.avgAgentTalkoverRatePct) },
    {
      kind: 'insight',
      label: 'Most Non-Adherence Area',
      name: kpi.mostNonAdherenceAreaLabel === 'NA' ? '—' : kpi.mostNonAdherenceAreaLabel,
      pct: formatKpiPercent(kpi.mostNonAdherenceAreaPct),
    },
    {
      kind: 'insight',
      label: 'Most Frequent Missed SOP',
      name: kpi.mostFrequentMissedSopLabel === 'NA' ? '—' : kpi.mostFrequentMissedSopLabel,
      pct: formatKpiPercent(kpi.mostFrequentMissedSopCallPct),
    },
  ];
}

export default function KpiGrid({ kpi }: { kpi: KpiSummary }) {
  return <TileGrid tiles={buildTiles(kpi)} />;
}
