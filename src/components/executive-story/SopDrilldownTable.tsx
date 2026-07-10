import type { SopDrilldownRow } from '../../lib/data/executiveStoryData';
import { toneForYesNo } from '../../lib/ui/status';
import DataTable, { type DataTableColumn } from './DataTable';
import StatusPill from './StatusPill';
import { formatCell, formatPct } from './formatters';

function flagCell(value: unknown) {
  const text = formatCell(value);
  if (text === '—') return text;
  return <StatusPill tone={toneForYesNo(value)} label={text} />;
}

const ALL_COLUMNS: DataTableColumn<SopDrilldownRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (r) => r.call_id, render: (r) => formatCell(r.call_id) },
  { key: 'agent_id', header: 'Agent ID', accessor: (r) => r.agent_id, render: (r) => formatCell(r.agent_id) },
  { key: 'agent_name', header: 'Agent Name', accessor: (r) => r.agent_name, render: (r) => formatCell(r.agent_name) },
  { key: 'call_type', header: 'Call Type', accessor: (r) => r.call_type, render: (r) => formatCell(r.call_type) },
  { key: 'sop_call_type', header: 'SOP Call Type', accessor: (r) => r.sop_call_type, render: (r) => formatCell(r.sop_call_type) },
  { key: 'sop_file', header: 'SOP File', accessor: (r) => r.sop_file, render: (r) => formatCell(r.sop_file) },
  {
    key: 'sop_coverage_pct',
    header: 'SOP Adherence %',
    accessor: (r) => Number(r.sop_coverage_pct),
    render: (r) => formatPct(r.sop_coverage_pct),
  },
  {
    key: 'purpose_context_explained',
    header: 'Purpose Explained',
    accessor: (r) => r.purpose_context_explained,
    render: (r) => flagCell(r.purpose_context_explained),
  },
  {
    key: 'consent_availability_checked',
    header: 'Consent Checked',
    accessor: (r) => r.consent_availability_checked,
    render: (r) => flagCell(r.consent_availability_checked),
  },
  {
    key: 'survey_completion_status',
    header: 'Survey Completion',
    accessor: (r) => r.survey_completion_status,
    render: (r) => flagCell(r.survey_completion_status),
  },
  {
    key: 'proper_closure_detected',
    header: 'Proper Closure',
    accessor: (r) => r.proper_closure_detected,
    render: (r) => flagCell(r.proper_closure_detected),
  },
  {
    key: 'followup_next_step_mentioned',
    header: 'Follow-up Mentioned',
    accessor: (r) => r.followup_next_step_mentioned,
    render: (r) => flagCell(r.followup_next_step_mentioned),
  },
];

interface SopDrilldownTableProps {
  rows: SopDrilldownRow[];
  /** Column keys to render, in order. Omit to render every column (Executive Story's usage). */
  columns?: string[];
  emptyMessage?: string;
}

export default function SopDrilldownTable({ rows, columns, emptyMessage = 'No calls match the current selection.' }: SopDrilldownTableProps) {
  const visibleColumns = columns ? ALL_COLUMNS.filter((column) => columns.includes(column.key)) : ALL_COLUMNS;
  return <DataTable columns={visibleColumns} rows={rows} rowKey={(row, index) => String(row.call_id ?? index)} emptyMessage={emptyMessage} />;
}
