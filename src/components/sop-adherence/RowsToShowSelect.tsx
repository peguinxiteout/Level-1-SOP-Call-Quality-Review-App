export const ROWS_TO_SHOW_OPTIONS = [10, 25, 50, 'all'] as const;
export type RowsToShow = (typeof ROWS_TO_SHOW_OPTIONS)[number];

interface RowsToShowSelectProps {
  value: RowsToShow;
  onChange: (value: RowsToShow) => void;
}

/** A plain row-count slice control, not real pagination - no page-number controls. */
export default function RowsToShowSelect({ value, onChange }: RowsToShowSelectProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="rows-to-show" className="text-sm font-medium text-text-muted">
        Rows to show
      </label>
      <select
        id="rows-to-show"
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === 'all' ? 'all' : (Number(raw) as RowsToShow));
        }}
        className="rounded-md border border-accent-secondary/40 bg-background px-3 py-1.5 text-sm text-text-primary"
      >
        {ROWS_TO_SHOW_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option === 'all' ? 'All' : option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function sliceRows<T>(rows: T[], rowsToShow: RowsToShow): T[] {
  return rowsToShow === 'all' ? rows : rows.slice(0, rowsToShow);
}
