import type { ReactNode } from 'react';

export type ColumnWidth = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Explicit per-column width tiers, picked by content shape rather than
 * auto-detected. Every column should set one deliberately:
 *  - xs: short unbreakable content - IDs, counts, scores, plain percentages.
 *  - sm: short badges/pills and short labels (call type, status pill text).
 *  - md: moderate content - combined cells, category/sub-category text.
 *  - lg: long free-text that wraps (SOP text, reasons, file names, quotes).
 */
const WIDTH_STYLES: Record<ColumnWidth, { minWidth: string; maxWidth: string }> = {
  xs: { minWidth: '64px', maxWidth: '100px' },
  sm: { minWidth: '120px', maxWidth: '170px' },
  md: { minWidth: '180px', maxWidth: '260px' },
  lg: { minWidth: '720px', maxWidth: '720px' },
};

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Raw value for this column. Currently unused by DataTable itself (sorting was removed); kept for callers that still derive display values from it. */
  accessor?: (row: T) => string | number | null | undefined;
  render: (row: T) => ReactNode;
  /** Width tier for this column's cells. Defaults to 'md' when omitted. */
  width?: ColumnWidth;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
}

export default function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No data available.' }: DataTableProps<T>) {
  if (!rows.length) {
    return <p className="rounded-lg border-2 border-white/40 bg-surface p-4 text-sm text-text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="scroll-hover max-h-80 overflow-auto rounded-lg border-2 border-white/40">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-accent-secondary">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-normal break-words border-r border-b border-white/30 px-3 py-2 align-middle font-medium text-text-primary"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            return (
              <tr key={rowKey(row, index)} className="bg-background">
                {columns.map((column) => {
                  const baseClasses = 'whitespace-normal break-words border-r border-b border-white/30 px-3 py-2 align-top text-text-primary';
                  const style = WIDTH_STYLES[column.width ?? 'md'];
                  return (
                    <td key={column.key} className={baseClasses} style={style}>
                      {column.render(row)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
