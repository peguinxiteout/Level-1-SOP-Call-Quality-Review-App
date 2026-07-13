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

function agentCell(row: SopDrilldownRow) {
  return (
    <div>
      <div className="text-text-primary">{formatCell(row.agent_name)}</div>
      <div className="text-xs text-text-primary">{formatCell(row.agent_id)}</div>
    </div>
  );
}

/**
 * Width tiers:
 *  - xs: call_id (plain ID), sop_coverage_pct (plain percentage, no badge).
 *  - sm: agent (name+id 2-line cell), call_type, sop_call_type (short
 *    labels), and the Yes/No/Not Applicable flag badges.
 *  - md: sop_file (SOP document filename - variable length, but short
 *    enough that the 720px lg tier left mostly empty space; wraps to 2
 *    lines instead).
 */
const ALL_COLUMNS: DataTableColumn<SopDrilldownRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (r) => r.call_id, width: 'xs', render: (r) => formatCell(r.call_id) },
  { key: 'agent', header: 'Agent', accessor: (r) => r.agent_name, width: 'sm', render: agentCell },
  { key: 'call_type', header: 'Call Type', accessor: (r) => r.call_type, width: 'sm', render: (r) => formatCell(r.call_type) },
  { key: 'sop_call_type', header: 'SOP Call Type', accessor: (r) => r.sop_call_type, width: 'sm', render: (r) => formatCell(r.sop_call_type) },
  { key: 'sop_file', header: 'SOP File', accessor: (r) => r.sop_file, width: 'md', render: (r) => formatCell(r.sop_file) },
  {
    key: 'sop_coverage_pct',
    header: 'SOP Adherence %',
    accessor: (r) => Number(r.sop_coverage_pct),
    width: 'xs',
    render: (r) => formatPct(r.sop_coverage_pct),
  },
  {
    key: 'purpose_context_explained',
    header: 'Purpose Context Explained',
    accessor: (r) => r.purpose_context_explained,
    width: 'sm',
    render: (r) => flagCell(r.purpose_context_explained),
  },
  {
    key: 'consent_availability_checked',
    header: 'Consent Availability Checked',
    accessor: (r) => r.consent_availability_checked,
    width: 'sm',
    render: (r) => flagCell(r.consent_availability_checked),
  },
  // {
  //   key: 'survey_completion_status',
  //   header: 'Survey Completion',
  //   accessor: (r) => r.survey_completion_status,
  //   render: (r) => flagCell(r.survey_completion_status),
  // },
  {
    key: 'proper_closure_detected',
    header: 'Proper Closure Detected',
    accessor: (r) => r.proper_closure_detected,
    width: 'sm',
    render: (r) => flagCell(r.proper_closure_detected),
  },
  // {
  //   key: 'followup_next_step_mentioned',
  //   header: 'Follow-up Mentioned',
  //   accessor: (r) => r.followup_next_step_mentioned,
  //   render: (r) => flagCell(r.followup_next_step_mentioned),
  // },
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
