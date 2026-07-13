import DataTable, { type DataTableColumn } from './DataTable';
import { formatCell, formatDurationMin } from './formatters';
import { INSPECTOR_FIELD_WIDTHS } from './inspectorColumnWidths';

interface GenericInspectorTableProps {
  rows: Record<string, unknown>[];
  /** Maps a raw column key (e.g. "agent_text_for_retrieval") to a display label. Keys not listed fall back to the raw key. */
  labelMap?: Record<string, string>;
  /** Raw column keys to omit from the rendered table entirely. */
  excludeKeys?: string[];
}

function agentCell(row: Record<string, unknown>) {
  return (
    <div>
      <div className="text-text-primary">{formatCell(row.agent_name)}</div>
      <div className="text-xs text-text-primary">{formatCell(row.agent_id)}</div>
    </div>
  );
}

/** Renders whatever columns are present on the first row - used for raw per-call inspector data with no curated shape. */
export default function GenericInspectorTable({ rows, labelMap, excludeKeys }: GenericInspectorTableProps) {
  if (!rows.length) {
    return <p className="p-4 text-sm text-text-muted">Not available for this call.</p>;
  }

  const firstRow = rows[0];
  const hasAgentId = 'agent_id' in firstRow;
  const hasAgentName = 'agent_name' in firstRow;
  const shouldMergeAgent = hasAgentId && hasAgentName;

  const columns: DataTableColumn<Record<string, unknown>>[] = Object.keys(firstRow)
    .filter((key) => {
      if (excludeKeys?.includes(key)) return false;
      if (shouldMergeAgent && (key === 'agent_id' || key === 'agent_name')) return false;
      return true;
    })
    .map((key) => ({
      key,
      header: labelMap?.[key] ?? key,
      accessor: (row) => {
        const value = row[key];
        return typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '');
      },
      width: INSPECTOR_FIELD_WIDTHS[key] ?? 'md',
      render: (row) => (key === 'duration_min' ? formatDurationMin(row[key]) : formatCell(row[key])),
    }));

  if (shouldMergeAgent) {
    columns.splice(1, 0, {
      key: 'agent',
      header: 'Agent',
      accessor: (row) => {
        const value = row.agent_name;
        return typeof value === 'string' || typeof value === 'number' ? value : String(value ?? '');
      },
      width: 'sm',
      render: agentCell,
    });
  }

  return <DataTable columns={columns} rows={rows} rowKey={(_row, index) => String(index)} />;
}
