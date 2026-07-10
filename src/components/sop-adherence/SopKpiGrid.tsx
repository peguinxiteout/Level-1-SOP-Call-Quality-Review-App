import type { KpiSummary } from '../../lib/calculations/executiveStoryCalculations';
import { formatKpiPercent } from '../executive-story/formatters';
import TileGrid, { type Tile } from '../executive-story/TileGrid';

interface SopKpiGridProps {
  callsProcessed: number;
  kpi: KpiSummary;
}

function buildTiles({ callsProcessed, kpi }: SopKpiGridProps): Tile[] {
  return [
    { kind: 'stat', label: 'Calls Processed', value: String(callsProcessed) },
    { kind: 'stat', label: 'Avg SOP Adherence', value: formatKpiPercent(kpi.avgSopAdherencePct) },
    { kind: 'stat', label: 'Opening SOP Adherence', value: formatKpiPercent(kpi.openingSopAdherencePct) },
    { kind: 'stat', label: 'Middle Section SOP Adherence', value: formatKpiPercent(kpi.middleSectionSopAdherencePct) },
    { kind: 'stat', label: 'Closure SOP Adherence', value: formatKpiPercent(kpi.closureSopAdherencePct) },
    { kind: 'stat', label: 'Avg SOP Sequence Followed', value: formatKpiPercent(kpi.avgSopSequenceFollowedPct) },
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
      pct: `${formatKpiPercent(kpi.mostFrequentMissedSopCallPct)} calls`,
    },
  ];
}

export default function SopKpiGrid(props: SopKpiGridProps) {
  return <TileGrid tiles={buildTiles(props)} />;
}
