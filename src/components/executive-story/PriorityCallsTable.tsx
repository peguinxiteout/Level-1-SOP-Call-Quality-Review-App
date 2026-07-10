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

const columns: DataTableColumn<PriorityCallRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (r) => r.call_id, render: (r) => formatCell(r.call_id) },
  { key: 'agent_id', header: 'Agent ID', accessor: (r) => r.agent_id, render: (r) => formatCell(r.agent_id) },
  { key: 'call_type', header: 'Call Type', accessor: (r) => r.call_type, render: (r) => formatCell(r.call_type) },
  {
    key: 'sop_coverage',
    header: 'SOP Adherence %',
    accessor: (r) => Number(r.sop_checklist_coverage_incl_review_pct),
    render: (r) => formatPct(r.sop_checklist_coverage_incl_review_pct),
  },
  { key: 'attention_reason', header: 'Attention Reason', render: (r) => formatCell(r.attention_reason) },
  {
    key: 'priority_level',
    header: 'Priority Level',
    accessor: (r) => r.priority_level,
    render: (r) => <StatusPill tone={toneForPriority(r.priority_level)} label={r.priority_level} />,
  },
  {
    key: 'agent_talktime',
    header: 'Agent Talktime %',
    accessor: (r) => Number(r.agent_talktime_pct),
    render: (r) => bandedPctCell(r.agent_talktime_pct, r.agent_talktime_band),
  },
  {
    key: 'agent_silence',
    header: 'Agent Silence %',
    accessor: (r) => Number(r.agent_silence_pct),
    render: (r) => bandedPctCell(r.agent_silence_pct, r.agent_silence_band),
  },
  {
    key: 'concern_flag',
    header: 'Customer Concern Found',
    accessor: (r) => r.customer_experience_concern_call_flag,
    render: (r) => {
      const text = formatCell(r.customer_experience_concern_call_flag);
      return text === '—' ? text : <StatusPill tone={toneForConcernFlag(r.customer_experience_concern_call_flag)} label={text} />;
    },
  },
  {
    key: 'agent_talkover',
    header: 'Agent Talk-over %',
    accessor: (r) => Number(r.agent_talkover_pct),
    render: (r) => bandedPctCell(r.agent_talkover_pct, r.agent_talkover_band),
  },
  { key: 'audio_metrics', header: 'Audio Metrics Available', accessor: (r) => r.audio_metrics_available, render: (r) => formatCell(r.audio_metrics_available) },
  { key: 'status', header: 'Status', accessor: (r) => r.status, render: (r) => formatCell(r.status) },
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
