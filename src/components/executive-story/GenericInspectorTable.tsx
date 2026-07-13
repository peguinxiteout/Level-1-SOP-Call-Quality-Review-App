import DataTable, { type DataTableColumn } from './DataTable';
import { formatCell } from './formatters';

interface GenericInspectorTableProps {
  rows: Record<string, unknown>[];
  /** Maps a raw column key (e.g. "agent_text_for_retrieval") to a display label. Keys not listed fall back to the raw key. */
  labelMap?: Record<string, string>;
  /** Raw column keys to omit from the rendered table entirely. */
  excludeKeys?: string[];
}

/** Renders whatever columns are present on the first row - used for raw per-call inspector data with no curated shape. */
export default function GenericInspectorTable({ rows, labelMap, excludeKeys }: GenericInspectorTableProps) {
  if (!rows.length) {
    return <p className="p-4 text-sm text-text-muted">Not available for this call.</p>;
  }

  const columns: DataTableColumn<Record<string, unknown>>[] = Object.keys(rows[0])
    .filter((key) => !excludeKeys?.includes(key))
    .map((key) => ({
    key,
    header: labelMap?.[key] ?? key,
    accessor: (row) => {
      const value = row[key];
      return typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '');
    },
    render: (row) => formatCell(row[key]),
  }));

  return <DataTable columns={columns} rows={rows} rowKey={(_row, index) => String(index)} />;
}
