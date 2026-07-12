import type { SequenceSummaryRow } from '../../lib/calculations/executiveStoryCalculations';
import DataTable, { type DataTableColumn } from '../executive-story/DataTable';
import { formatCell, formatPct } from '../executive-story/formatters';

const columns: DataTableColumn<SequenceSummaryRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (r) => r.call_id, render: (r) => formatCell(r.call_id) },
  {
    key: 'evidenced_sop_items',
    header: 'SOP Steps Observed',
    accessor: (r) => Number(r.evidenced_sop_items),
    render: (r) => formatCell(r.evidenced_sop_items),
  },
  {
    key: 'sequence_break_count',
    header: 'Sequence Break Count',
    accessor: (r) => Number(r.sequence_break_count),
    render: (r) => formatCell(r.sequence_break_count),
  },
  {
    key: 'sequence_followed_pct',
    header: 'SOP Sequence Followed %',
    accessor: (r) => Number(r.sequence_followed_pct),
    render: (r) => formatPct(r.sequence_followed_pct),
  },
  {
    key: 'first_sequence_break',
    header: 'First Sequence Break',
    accessor: (r) => r.first_sequence_break,
    render: (r) => formatCell(r.first_sequence_break),
  },
];

/**
 * Shows every call unconditionally, worst-sequence-adherence first (the
 * order computeSequenceAdherenceDetail already returns) - the live app never
 * filters this down to only calls with breaks. The caller wraps this in the
 * shared scroll container instead of limiting the row count here.
 */
export default function SequenceAdherenceTable({ rows }: { rows: SequenceSummaryRow[] }) {
  return <DataTable columns={columns} rows={rows} rowKey={(row, index) => String(row.call_id ?? index)} emptyMessage="No sequence data available." />;
}
