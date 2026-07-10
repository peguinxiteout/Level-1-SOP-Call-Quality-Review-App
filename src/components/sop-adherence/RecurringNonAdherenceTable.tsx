import type { FrequentNonAdherenceRow } from '../../lib/calculations/executiveStoryCalculations';
import DataTable, { type DataTableColumn } from '../executive-story/DataTable';
import { formatCell, formatPct } from '../executive-story/formatters';

const columns: DataTableColumn<FrequentNonAdherenceRow>[] = [
  { key: 'category', header: 'Category', accessor: (r) => r.category, render: (r) => formatCell(r.category) },
  { key: 'sub_category', header: 'Sub-Category', accessor: (r) => r.sub_category, render: (r) => formatCell(r.sub_category) },
  { key: 'item_text', header: 'SOP', accessor: (r) => r.item_text, render: (r) => formatCell(r.item_text) },
  {
    key: 'non_adherence_count',
    header: 'Non-Adherence Count',
    accessor: (r) => Number(r.non_adherence_count),
    render: (r) => formatCell(r.non_adherence_count),
  },
  {
    key: 'affected_call_pct',
    header: 'Affected Call %',
    accessor: (r) => Number(r.affected_call_pct),
    render: (r) => formatPct(r.affected_call_pct),
  },
];

export default function RecurringNonAdherenceTable({ rows }: { rows: FrequentNonAdherenceRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row, index) => `${row.category}-${row.sub_category}-${row.item_text}-${index}`}
      emptyMessage="No recurring non-adherence patterns found."
    />
  );
}
