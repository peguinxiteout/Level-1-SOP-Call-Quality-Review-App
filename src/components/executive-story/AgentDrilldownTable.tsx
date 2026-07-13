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

function agentCell(row: AgentDrilldownRow) {
  return (
    <div>
      <div className="text-text-primary">{formatCell(row.agent_name)}</div>
      <div className="text-xs text-text-primary">{formatCell(row.agent_id)}</div>
    </div>
  );
}

/**
 * Width tiers:
 *  - xs: call_id, long_turns (count), concern_flag, audio_available (all
 *    plain short values/words, no long free text anywhere in this table).
 *  - sm: agent (name+id 2-line cell), call_type, and the pct+band combo
 *    cells (talktime/silence/talkover/customer_talkover/wpm).
 */
const columns: DataTableColumn<AgentDrilldownRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (r) => r.call_id, width: 'xs', render: (r) => formatCell(r.call_id) },
  { key: 'agent', header: 'Agent', accessor: (r) => r.agent_name, width: 'sm', render: agentCell },
  { key: 'call_type', header: 'Call Type', accessor: (r) => r.call_type, width: 'sm', render: (r) => formatCell(r.call_type) },
  {
    key: 'talktime',
    header: 'Agent Talktime %',
    accessor: (r) => Number(r.agent_talk_ratio_pct),
    width: 'sm',
    render: (r) => bandedValueCell(r.agent_talk_ratio_pct, r.agent_talk_ratio_band),
  },
  {
    key: 'silence',
    header: 'Agent Silence %',
    accessor: (r) => Number(r.silence_ratio_pct),
    width: 'sm',
    render: (r) => bandedValueCell(r.silence_ratio_pct, r.silence_ratio_band),
  },
  {
    key: 'talkover',
    header: 'Agent Talk-over %',
    accessor: (r) => Number(r.agent_talkover_rate_pct),
    width: 'sm',
    render: (r) => bandedValueCell(r.agent_talkover_rate_pct, r.agent_talkover_rate_band),
  },
  {
    key: 'customer_talkover',
    header: 'Customer Talk-over %',
    accessor: (r) => Number(r.customer_talkover_rate_pct),
    width: 'sm',
    render: (r) => bandedValueCell(r.customer_talkover_rate_pct, r.customer_talkover_rate_band),
  },
  {
    key: 'wpm',
    header: 'Agent WPM',
    accessor: (r) => Number(r.agent_wpm),
    width: 'sm',
    render: (r) => bandedValueCell(r.agent_wpm, r.agent_wpm_band, formatWpm),
  },
  {
    key: 'long_turns',
    header: 'Long Agent Turns',
    accessor: (r) => Number(r.long_agent_turn_count),
    width: 'xs',
    render: (r) => formatCell(r.long_agent_turn_count),
  },
  {
    key: 'concern_flag',
    header: 'Customer Concern Found',
    accessor: (r) => r.customer_experience_concern_call_flag,
    width: 'xs',
    render: (r) => formatCell(r.customer_experience_concern_call_flag),
  },
  {
    key: 'audio_available',
    header: 'Audio Metrics Available',
    accessor: (r) => r.audio_metrics_available,
    width: 'xs',
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
