import { useCallInspector } from '../../hooks/useCallInspector';
import GenericInspectorTable from './GenericInspectorTable';
import SopResultTable from './SopResultTable';
import TabGroup from './TabGroup';
import TranscriptView from './TranscriptView';

const RETRIEVAL_EVIDENCE_LABELS: Record<string, string> = {
  output_version: 'Output Version',
  output_generated_at: 'Output Generated At',
  sop_call_type: 'SOP Call Type',
  agent_id: 'Agent ID',
  agent_name: 'Agent Name',
  agent_name_confidence: 'Agent Name Confidence',
  agent_identity_source: 'Agent Identity Source',
  call_id: 'Call ID',
  item_id: 'Item ID',
  rank: 'Rank',
  candidate_id: 'Candidate ID',
  turn_ids: 'Turn IDs',
  agent_turn_id: 'Agent Turn ID',
  candidate_type: 'Candidate Type',
  retrieval_query: 'Retrieval Query',
  agent_text_for_retrieval: 'Agent Text for Retrieval',
  candidate_text: 'Candidate Text',
  context_text_for_evaluation: 'Context Text for Evaluation',
  key_match_score: 'Key Match Score',
  retrieval_score: 'Retrieval Score',
  combined_score: 'Combined Score',
  retrieval_method: 'Retrieval Method',
  retrieval_error: 'Retrieval Error',
};

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
            content: (
              <GenericInspectorTable
                rows={data.retrievalEvidence}
                labelMap={RETRIEVAL_EVIDENCE_LABELS}
                excludeKeys={['output_version', 'output_generated_at']}
              />
            ),
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
