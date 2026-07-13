type ResolvedRole = 'Agent' | 'Customer';

/** A single transcript turn. Looser than `TurnRow` so callers backed by plain CSV records (no `call_id`) can pass rows directly. */
export interface TranscriptTurn {
  turn_id?: string | number;
  [column: string]: unknown;
}

/** The raw diarization tag (e.g. "SPEAKER_1"), always shown - either on its own or beneath the resolved label. */
function rawSpeakerTag(turn: TranscriptTurn): string {
  return String(turn.speaker ?? '').trim() || 'Speaker';
}

/** Only trusts an explicit "agent"/"customer" role; anything else (e.g. "Unknown") is left unresolved rather than guessed at. */
function resolvedRole(turn: TranscriptTurn): ResolvedRole | null {
  const role = String(turn.role ?? '').trim().toLowerCase();
  if (role === 'agent') return 'Agent';
  if (role === 'customer') return 'Customer';
  return null;
}

function formatTimestamp(turn: TranscriptTurn): string {
  const startNum = Number(turn.start_time_sec);
  if (!Number.isFinite(startNum)) return '';
  const endNum = Number(turn.end_time_sec);
  if (!Number.isFinite(endNum)) return `${startNum.toFixed(1)}s`;
  return `${startNum.toFixed(1)}–${endNum.toFixed(1)}s`;
}

/** Chat-log style transcript, shared by the Executive Story, SOP Adherence, and Agent Performance tabs. */
export default function TranscriptView({ turns }: { turns: TranscriptTurn[] }) {
  if (!turns.length) {
    return (
      <div className="rounded-xl border border-white/60 bg-black p-4 text-sm text-text-muted">
        Transcript turns not available.
      </div>
    );
  }

  return (
    <div className="scroll-hover flex max-h-[32rem] flex-col gap-4 overflow-auto rounded-xl border border-white/70 bg-black px-6 py-5">
      {turns.map((turn, index) => {
        const role = resolvedRole(turn);
        const isAgent = role === 'Agent';
        const speakerTag = rawSpeakerTag(turn);
        const timestamp = formatTimestamp(turn);

        return (
          <div key={`${turn.turn_id ?? index}`} className={`flex w-full ${isAgent ? 'justify-start pr-[22%]' : 'justify-end pl-[22%]'}`}>
            <div
              className={`max-w-[620px] rounded-lg border px-3 py-2 shadow-sm ${
                isAgent ? 'border-violet-500/70 bg-[#241f63]' : 'border-blue-500/70 bg-[#17326d]'
              }`}
            >
              <div className="mb-1 flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="font-semibold text-text-primary">{role ?? speakerTag}</span>
                  {timestamp ? <span>{timestamp}</span> : null}
                </div>
                {role ? <span className="text-[11px] text-text-muted/70">{speakerTag}</span> : null}
              </div>

              <p className="whitespace-normal break-words text-sm leading-relaxed text-text-primary">
                {String(turn.utterance ?? '') || 'NA'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
