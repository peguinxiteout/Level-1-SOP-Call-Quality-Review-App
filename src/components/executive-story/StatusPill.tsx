import type { StatusTone } from '../../lib/ui/status';

const TONE_STYLES: Record<StatusTone, string> = {
  good: 'bg-status-good/15 text-status-good',
  warning: 'bg-status-warning/15 text-status-warning',
  critical: 'bg-status-critical/15 text-status-critical',
  neutral: 'bg-status-neutral/15 text-status-neutral',
};

const TONE_DOT: Record<StatusTone, string> = {
  good: 'bg-status-good',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  neutral: 'bg-status-neutral',
};

interface StatusPillProps {
  tone: StatusTone;
  label: string;
}

/** Icon (dot) + label - status color never carries meaning by hue alone. */
export default function StatusPill({ tone, label }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_STYLES[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      {label}
    </span>
  );
}
