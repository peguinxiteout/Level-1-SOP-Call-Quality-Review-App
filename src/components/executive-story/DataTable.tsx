import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Raw value used for sorting. Omit to make the column unsortable (e.g. an actions column). */
  accessor?: (row: T) => string | number | null | undefined;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc';

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
  const aMissing = a === null || a === undefined || a === '';
  const bMissing = b === null || b === undefined || b === '';
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1; // missing values sort last regardless of direction
  if (bMissing) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;

  const aNum = Number(a);
  const bNum = Number(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  return String(a).localeCompare(String(b));
}

export default function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No data available.' }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.accessor) return rows;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => factor * compareValues(column.accessor!(a), column.accessor!(b)));
  }, [rows, sort, columns]);

  if (!rows.length) {
    return <p className="rounded-lg border border-accent-secondary/30 bg-surface p-4 text-sm text-text-muted">{emptyMessage}</p>;
  }

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.accessor) return;
    setSort((current) => {
      if (!current || current.key !== column.key) return { key: column.key, direction: 'asc' };
      if (current.direction === 'asc') return { key: column.key, direction: 'desc' };
      return null;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-accent-secondary/30">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="bg-accent-secondary/20">
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  onClick={() => toggleSort(column)}
                  className={`whitespace-nowrap px-3 py-2 font-medium text-text-muted ${
                    column.accessor ? 'cursor-pointer select-none hover:text-text-primary' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.accessor && (
                      <span className="text-[10px] text-text-muted/70">
                        {isSorted ? (sort!.direction === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={rowKey(row, index)} className="border-t border-accent-secondary/20 bg-surface even:bg-accent-secondary/10">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-normal break-words px-3 py-2 align-top text-text-primary">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
