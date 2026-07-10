import type { ExecutiveSignalRow } from '../../lib/data/executiveStoryData';
import DataTable, { type DataTableColumn } from './DataTable';

const columns: DataTableColumn<ExecutiveSignalRow>[] = [
  {
    key: 'area',
    header: 'Area',
    accessor: (row) => row.area,
    render: (row) => (
      <span className="inline-block rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-highlight">
        {row.area}
      </span>
    ),
  },
  {
    key: 'insight',
    header: 'Insight',
    accessor: (row) => row.insight,
    render: (row) => row.insight,
  },
];

export default function SignalsTable({ rows }: { rows: ExecutiveSignalRow[] }) {
  return (
    <DataTable columns={columns} rows={rows} rowKey={(row, index) => `${row.area}-${index}`} emptyMessage="No signals available." />
  );
}