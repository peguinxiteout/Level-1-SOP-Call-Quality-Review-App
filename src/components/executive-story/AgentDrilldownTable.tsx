import type { AgentDrilldownRow } from '../../lib/data/executiveStoryData';
import { toneForBand } from '../../lib/ui/status';
import DataTable, { type DataTableColumn } from './DataTable';
import StatusPill from './StatusPill';
import { formatCell, formatPct, formatWpm } from './formatters';

function bandedValueCell(value: unknown, band: unknown, formatValue: (value: unknown) => string = formatPct) {
  const bandText = formatCell(band);
  return (
    <div className="flex items-center gap-2">
      <span>{formatValue(value)}</span>
      {bandText !== '—' && <StatusPill tone={toneForBand(band)} label={bandText} />}
    </div>
  );
}

const columns: DataTableColumn<AgentDrilldownRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (r) => r.call_id, render: (r) => formatCell(r.call_id) },
  { key: 'agent_id', header: 'Agent ID', accessor: (r) => r.agent_id, render: (r) => formatCell(r.agent_id) },
  { key: 'agent_name', header: 'Agent Name', accessor: (r) => r.agent_name, render: (r) => formatCell(r.agent_name) },
  { key: 'call_type', header: 'Call Type', accessor: (r) => r.call_type, render: (r) => formatCell(r.call_type) },
  {
    key: 'talktime',
    header: 'Talktime %',
    accessor: (r) => Number(r.agent_talk_ratio_pct),
    render: (r) => bandedValueCell(r.agent_talk_ratio_pct, r.agent_talk_ratio_band),
  },
  {
    key: 'silence',
    header: 'Silence %',
    accessor: (r) => Number(r.silence_ratio_pct),
    render: (r) => bandedValueCell(r.silence_ratio_pct, r.silence_ratio_band),
  },
  {
    key: 'talkover',
    header: 'Talk-over %',
    accessor: (r) => Number(r.agent_talkover_rate_pct),
    render: (r) => bandedValueCell(r.agent_talkover_rate_pct, r.agent_talkover_rate_band),
  },
  {
    key: 'customer_talkover',
    header: 'Customer Talk-over %',
    accessor: (r) => Number(r.customer_talkover_rate_pct),
    render: (r) => bandedValueCell(r.customer_talkover_rate_pct, r.customer_talkover_rate_band),
  },
  {
    key: 'wpm',
    header: 'WPM',
    accessor: (r) => Number(r.agent_wpm),
    render: (r) => bandedValueCell(r.agent_wpm, r.agent_wpm_band, formatWpm),
  },
  {
    key: 'long_turns',
    header: 'Long Turn Count',
    accessor: (r) => Number(r.long_agent_turn_count),
    render: (r) => formatCell(r.long_agent_turn_count),
  },
  {
    key: 'concern_flag',
    header: 'Customer Concern',
    accessor: (r) => r.customer_experience_concern_call_flag,
    render: (r) => formatCell(r.customer_experience_concern_call_flag),
  },
  {
    key: 'audio_available',
    header: 'Audio Metrics',
    accessor: (r) => r.audio_metrics_available,
    render: (r) => formatCell(r.audio_metrics_available),
  },
];

export default function AgentDrilldownTable({ rows }: { rows: AgentDrilldownRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row, index) => String(row.call_id ?? index)}
      emptyMessage="No calls match the current selection."
    />
  );
}
