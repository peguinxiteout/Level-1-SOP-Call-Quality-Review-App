interface CallSelectorProps {
  callIds: string[];
  selectedCallId: string;
  onChange: (callId: string) => void;
  label?: string;
}

/** Empty string = unselected - the default, unfiltered state. */
export default function CallSelector({ callIds, selectedCallId, onChange, label = 'Select call for SOP Adherence & Agent Performance' }: CallSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="call-selector" className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <select
        id="call-selector"
        value={selectedCallId}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-accent-secondary/40 bg-background px-3 py-1.5 text-sm text-text-primary"
      >
        <option value="">Choose an option</option>
        {callIds.map((callId) => (
          <option key={callId} value={callId}>
            {callId}
          </option>
        ))}
      </select>
    </div>
  );
}
