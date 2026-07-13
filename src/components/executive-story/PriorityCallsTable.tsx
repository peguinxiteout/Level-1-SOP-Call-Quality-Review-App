import type { PriorityCallRow } from '../../lib/calculations/executiveStoryCalculations';
import { toneForBand, toneForConcernFlag, toneForPriority } from '../../lib/ui/status';
import DataTable, { type DataTableColumn } from './DataTable';
import StatusPill from './StatusPill';
import { formatCell, formatPct } from './formatters';

function bandedPctCell(pct: unknown, band: unknown) {
  const bandText = formatCell(band);
  return (
    <div className="flex items-center gap-2">
      <span>{formatPct(pct)}</span>
      {bandText !== '—' && <StatusPill tone={toneForBand(band)} label={bandText} />}
    </div>
  );
}

/**
 * Width tiers:
 *  - xs: call_id, agent_id, priority_level (badge), concern_flag (badge),
 *    audio_metrics (Yes/No), status (short word).
 *  - sm: call_type (short label), and the three pct+band combo cells
 *    (agent_talktime/silence/talkover) and sop_coverage, which pair a
 *    percentage with a short status pill.
 *  - md: attention_reason (free-text explanation - variable length but
 *    usually short, so the 720px lg tier left mostly empty space; wraps
 *    across a few lines for the rare multi-reason case instead).
 */
const columns: DataTableColumn<PriorityCallRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (r) => r.call_id, width: 'xs', render: (r) => formatCell(r.call_id) },
  { key: 'agent_id', header: 'Agent ID', accessor: (r) => r.agent_id, width: 'xs', render: (r) => formatCell(r.agent_id) },
  { key: 'call_type', header: 'Call Type', accessor: (r) => r.call_type, width: 'sm', render: (r) => formatCell(r.call_type) },
  {
    key: 'sop_coverage',
    header: 'SOP Adherence %',
    accessor: (r) => Number(r.sop_checklist_coverage_incl_review_pct),
    width: 'sm',
    render: (r) => formatPct(r.sop_checklist_coverage_incl_review_pct),
  },
  { key: 'attention_reason', header: 'Attention Reason', width: 'md', render: (r) => formatCell(r.attention_reason) },
  {
    key: 'priority_level',
    header: 'Priority Level',
    accessor: (r) => r.priority_level,
    width: 'xs',
    render: (r) => <StatusPill tone={toneForPriority(r.priority_level)} label={r.priority_level} />,
  },
  {
    key: 'agent_talktime',
    header: 'Agent Talktime %',
    accessor: (r) => Number(r.agent_talktime_pct),
    width: 'sm',
    render: (r) => bandedPctCell(r.agent_talktime_pct, r.agent_talktime_band),
  },
  {
    key: 'agent_silence',
    header: 'Agent Silence %',
    accessor: (r) => Number(r.agent_silence_pct),
    width: 'sm',
    render: (r) => bandedPctCell(r.agent_silence_pct, r.agent_silence_band),
  },
  {
    key: 'concern_flag',
    header: 'Customer Concern Found',
    accessor: (r) => r.customer_experience_concern_call_flag,
    width: 'xs',
    render: (r) => {
      const text = formatCell(r.customer_experience_concern_call_flag);
      return text === '—' ? text : <StatusPill tone={toneForConcernFlag(r.customer_experience_concern_call_flag)} label={text} />;
    },
  },
  {
    key: 'agent_talkover',
    header: 'Agent Talk-over %',
    accessor: (r) => Number(r.agent_talkover_pct),
    width: 'sm',
    render: (r) => bandedPctCell(r.agent_talkover_pct, r.agent_talkover_band),
  },
  {
    key: 'audio_metrics',
    header: 'Audio Metrics Available',
    accessor: (r) => r.audio_metrics_available,
    width: 'xs',
    render: (r) => formatCell(r.audio_metrics_available),
  },
  { key: 'status', header: 'Status', accessor: (r) => r.status, width: 'xs', render: (r) => formatCell(r.status) },
];

export default function PriorityCallsTable({ rows }: { rows: PriorityCallRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row, index) => String(row.call_id ?? index)}
      emptyMessage="No high or medium priority call actions found."
    />
  );
}
