import DataTable, { type DataTableColumn } from './DataTable';
import { formatCell } from './formatters';

/** Renders whatever columns are present on the first row - used for raw per-call inspector data with no curated shape. */
export default function GenericInspectorTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <p className="p-4 text-sm text-text-muted">Not available for this call.</p>;
  }

  const columns: DataTableColumn<Record<string, unknown>>[] = Object.keys(rows[0]).map((key) => ({
    key,
    header: key,
    accessor: (row) => {
      const value = row[key];
      return typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '');
    },
    render: (row) => formatCell(row[key]),
  }));

  return <DataTable columns={columns} rows={rows} rowKey={(_row, index) => String(index)} />;
}
