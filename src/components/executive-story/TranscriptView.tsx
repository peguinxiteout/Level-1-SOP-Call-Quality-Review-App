import type { TurnRow } from '../../lib/data/callInspector';

function speakerLabel(turn: TurnRow): string {
  const role = String(turn.role ?? '').trim();
  if (role && role.toLowerCase() !== 'unknown') return role;
  return String(turn.speaker ?? 'Speaker').trim() || 'Speaker';
}

function formatTimestamp(turn: TurnRow): string {
  const start = turn.start_time_sec;
  const end = turn.end_time_sec;
  if (start === undefined || start === null) return '';
  const startNum = Number(start);
  const endNum = Number(end);
  if (Number.isNaN(startNum)) return '';
  if (Number.isNaN(endNum)) return `${startNum.toFixed(1)}s`;
  return `${startNum.toFixed(1)}–${endNum.toFixed(1)}s`;
}

function isAgentTurn(turn: TurnRow): boolean {
  return String(turn.role ?? '').trim().toLowerCase() === 'agent';
}

/** Chat-log style transcript. Reused by both the SOP and Agent Performance tab groups. */
export default function TranscriptView({ turns }: { turns: TurnRow[] }) {
  if (!turns.length) {
    return <p className="p-4 text-sm text-text-muted">Not available for this call.</p>;
  }

  return (
    <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto p-1">
      {turns.map((turn, index) => {
        const agent = isAgentTurn(turn);
        return (
          <div
            key={`${turn.turn_id ?? index}`}
            className={`max-w-[85%] rounded-lg border px-3 py-2 ${
              agent ? 'self-start border-accent/40 bg-accent/10' : 'self-end border-accent-secondary/40 bg-accent-secondary/10'
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
              <span className="font-semibold text-text-primary">{speakerLabel(turn)}</span>
              <span>{formatTimestamp(turn)}</span>
            </div>
            <p className="text-sm whitespace-normal text-text-primary">{String(turn.utterance ?? '')}</p>
          </div>
        );
      })}
    </div>
  );
}
