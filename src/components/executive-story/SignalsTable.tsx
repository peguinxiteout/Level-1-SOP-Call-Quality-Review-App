import type { ExecutiveSignalRow } from '../../lib/data/executiveStoryData';

export default function SignalsTable({ rows }: { rows: ExecutiveSignalRow[] }) {
  if (!rows.length) {
    return <p className="rounded-lg border border-accent-secondary/30 bg-surface p-4 text-sm text-text-muted">No signals available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-accent-secondary/30">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="bg-accent-secondary/20">
            <th className="whitespace-nowrap border-r border-b border-white/30 px-3 py-2 font-medium text-text-muted">Area</th>
            <th className="border-r border-b border-white/30 px-3 py-2 font-medium text-text-muted">Insight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.area}-${index}`} className="bg-background">
              <td className="border-r border-b border-white/30 px-3 py-2 align-top">
                <span className="inline-block rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-highlight">
                  {row.area}
                </span>
              </td>
              <td className="border-r border-b border-white/30 px-3 py-2 align-top whitespace-normal text-text-primary">{row.insight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
