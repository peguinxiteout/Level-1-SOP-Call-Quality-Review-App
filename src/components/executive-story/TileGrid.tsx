export interface StatTile {
  kind: 'stat';
  label: string;
  value: string;
}

export interface InsightTile {
  kind: 'insight';
  label: string;
  name: string;
  pct: string;
}

export type Tile = StatTile | InsightTile;

const CARD_SHELL = 'rounded-lg border border-accent-secondary/30 bg-surface p-4';

/** Shared KPI card grid renderer - reused by Executive Story's 12-card grid and the SOP Adherence tab's 8-card grid. */
export default function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) =>
        tile.kind === 'stat' ? (
          <div key={tile.label} className={CARD_SHELL}>
            <p className="text-xs font-medium text-text-muted">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{tile.value}</p>
          </div>
        ) : (
          <div key={tile.label} className={CARD_SHELL}>
            <p className="text-xs font-medium text-text-muted">{tile.label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-lg font-normal text-text-primary" title={tile.name}>
                {tile.name}
              </span>
              <span className="rounded-full bg-accent-secondary/30 px-2 py-0.5 text-xs font-medium text-text-muted">{tile.pct}</span>
            </p>
          </div>
        ),
      )}
    </div>
  );
}
