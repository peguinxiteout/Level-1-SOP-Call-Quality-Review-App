import type { SopAreaSummaryRow } from '../../lib/calculations/executiveStoryCalculations';
import DataTable, { type DataTableColumn } from '../executive-story/DataTable';
import { formatCell, formatPct } from '../executive-story/formatters';

// Width tiers: sm = category/sub_category taxonomy labels; xs = all counts/percentages (plain numbers, no badges).
const columns: DataTableColumn<SopAreaSummaryRow>[] = [
  { key: 'category', header: 'Category', accessor: (r) => r.category, width: 'sm', render: (r) => formatCell(r.category) },
  { key: 'sub_category', header: 'Sub-Category', accessor: (r) => r.sub_category, width: 'sm', render: (r) => formatCell(r.sub_category) },
  {
    key: 'total_sop_items',
    header: 'Total SOP Count',
    accessor: (r) => Number(r.total_sop_items),
    width: 'xs',
    render: (r) => formatCell(r.total_sop_items),
  },
  {
    key: 'applicable_sop_items',
    header: 'Applicable SOP Count',
    accessor: (r) => Number(r.applicable_sop_items),
    width: 'xs',
    render: (r) => formatCell(r.applicable_sop_items),
  },
  {
    key: 'sop_adherence_count',
    header: 'SOP Adherence Count',
    accessor: (r) => Number(r.sop_adherence_count),
    width: 'xs',
    render: (r) => formatCell(r.sop_adherence_count),
  },
  {
    key: 'non_adherence_pct',
    header: 'Non-Adherence %',
    accessor: (r) => Number(r.non_adherence_pct),
    width: 'xs',
    render: (r) => formatPct(r.non_adherence_pct),
  },
  {
    key: 'non_adherence_share_pct',
    header: 'Share of Non-Adherence %',
    accessor: (r) => Number(r.non_adherence_share_pct),
    width: 'xs',
    render: (r) => formatPct(r.non_adherence_share_pct),
  },
];

export default function SopAreaAdherenceTable({ rows }: { rows: SopAreaSummaryRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row, index) => `${row.category}-${row.sub_category}-${index}`}
      emptyMessage="No SOP area data available."
    />
  );
}
