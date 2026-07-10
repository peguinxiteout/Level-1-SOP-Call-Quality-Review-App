interface CallSelectorProps {
  callIds: string[];
  selectedCallId: string;
  onChange: (callId: string) => void;
}

/** Empty string = "All calls" - the default, unfiltered state. */
export default function CallSelector({ callIds, selectedCallId, onChange }: CallSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="call-selector" className="text-sm font-medium text-text-muted">
        Call
      </label>
      <select
        id="call-selector"
        value={selectedCallId}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-accent-secondary/40 bg-background px-3 py-1.5 text-sm text-text-primary"
      >
        <option value="">All calls</option>
        {callIds.map((callId) => (
          <option key={callId} value={callId}>
            {callId}
          </option>
        ))}
      </select>
    </div>
  );
}
