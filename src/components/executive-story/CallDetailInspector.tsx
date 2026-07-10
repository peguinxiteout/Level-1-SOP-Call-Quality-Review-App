import { useCallInspector } from '../../hooks/useCallInspector';
import GenericInspectorTable from './GenericInspectorTable';
import SopResultTable from './SopResultTable';
import TabGroup from './TabGroup';
import TranscriptView from './TranscriptView';

function SentimentEvidencePanel({
  negativeTurns,
  allTurns,
}: {
  negativeTurns: Record<string, unknown>[];
  allTurns: Record<string, unknown>[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h5 className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
          Customer Experience Concern Evidence
        </h5>
        {negativeTurns.length ? (
          <GenericInspectorTable rows={negativeTurns} />
        ) : (
          <p className="rounded-lg border border-status-good/30 bg-status-good/10 p-3 text-sm text-status-good">
            No customer experience concerns detected.
          </p>
        )}
      </div>
      <div>
        <h5 className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">All Turn-Level Sentiment Audit</h5>
        <GenericInspectorTable rows={allTurns} />
      </div>
    </div>
  );
}

interface CallDetailInspectorProps {
  callId: string;
  /** Executive Story shows both tab groups; the SOP Adherence tab is SOP-only. */
  showAgentPerformance?: boolean;
  title?: string;
}

export default function CallDetailInspector({ callId, showAgentPerformance = true, title }: CallDetailInspectorProps) {
  const { data, loading, error } = useCallInspector(callId);

  if (loading) return <p className="text-sm text-text-muted">Loading call detail…</p>;
  if (error) return <p className="text-sm text-status-critical">Failed to load call detail: {error}</p>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">{title ?? `Call Detail Inspector — ${callId}`}</h3>

      <TabGroup
        title="SOP"
        tabs={[
          {
            key: 'sop-result',
            label: 'SOP Result',
            available: data.sopItems.length > 0,
            content: <SopResultTable rows={data.sopItems} />,
          },
          {
            key: 'retrieval-evidence',
            label: 'Retrieval Evidence',
            available: data.retrievalEvidence.length > 0,
            content: <GenericInspectorTable rows={data.retrievalEvidence} />,
          },
          {
            key: 'sop-transcript',
            label: 'Transcript',
            available: data.turns.length > 0,
            content: <TranscriptView turns={data.turns} />,
          },
        ]}
      />

      {showAgentPerformance && (
        <TabGroup
          title="Agent Performance"
          tabs={[
            {
              key: 'turn-level-flow',
              label: 'Turn-Level Flow',
              available: data.qualityTurns.length > 0,
              content: <GenericInspectorTable rows={data.qualityTurns} />,
            },
            {
              key: 'sentiment-evidence',
              label: 'Sentiment Evidence',
              available: data.sentimentTurns.length > 0 || data.negativeSentimentTurns.length > 0,
              content: <SentimentEvidencePanel negativeTurns={data.negativeSentimentTurns} allTurns={data.sentimentTurns} />,
            },
            {
              key: 'agent-transcript',
              label: 'Transcript',
              available: data.turns.length > 0,
              content: <TranscriptView turns={data.turns} />,
            },
          ]}
        />
      )}
    </div>
  );
}
