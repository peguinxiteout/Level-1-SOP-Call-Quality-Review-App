import { useCallInspector } from '../../hooks/useCallInspector';
import GenericInspectorTable from './GenericInspectorTable';
import TabGroup from './TabGroup';
import TranscriptView from './TranscriptView';

const EXCLUDED_TURN_KEYS = ['output_version', 'output_generated_at'];

const COMMON_TURN_LABELS: Record<string, string> = {
  sop_call_type: 'SOP Call Type',
  agent_id: 'Agent ID',
  agent_name: 'Agent Name',
  agent_name_confidence: 'Agent Name Confidence',
  agent_identity_source: 'Agent Identity Source',
  call_id: 'Call ID',
  turn_id: 'Turn ID',
  speaker: 'Speaker',
  start_time_sec: 'Start Time (sec)',
  end_time_sec: 'End Time (sec)',
  duration_sec: 'Duration (sec)',
  utterance: 'Utterance',
  role: 'Role',
};

const QUALITY_TURN_LABELS: Record<string, string> = {
  ...COMMON_TURN_LABELS,
  word_count: 'Word Count',
  duration_min: 'Duration (min)',
  wpm: 'WPM',
  gap_from_previous_sec: 'Gap From Previous (sec)',
  agent_response_gap_from_customer_sec: 'Agent Response Gap From Customer (sec)',
  overlap_with_previous_sec: 'Overlap With Previous (sec)',
  agent_talkover_with_previous_customer_sec: 'Agent Talk-over With Previous Customer (sec)',
  customer_talkover_with_previous_agent_sec: 'Customer Talk-over With Previous Agent (sec)',
  is_long_agent_turn: 'Long Agent Turn',
};

const SENTIMENT_TURN_LABELS: Record<string, string> = {
  ...COMMON_TURN_LABELS,
  sentiment_label: 'Sentiment Label',
  sentiment_score: 'Sentiment Score',
  positive_component: 'Positive Component',
  neutral_component: 'Neutral Component',
  negative_component: 'Negative Component',
  experience_classifier_used: 'Experience Classifier Used',
  customer_experience_label: 'Customer Experience Label',
  is_customer_experience_negative: 'Customer Experience Negative',
  customer_experience_confidence: 'Customer Experience Confidence',
  customer_experience_reason: 'Customer Experience Reason',
  customer_experience_issue_theme: 'Customer Experience Issue Theme',
  customer_experience_issue_pointer: 'Customer Experience Issue Pointer',
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
          <div className="w-full max-h-80 overflow-auto scroll-hover [&>div]:overflow-visible">
            <GenericInspectorTable rows={negativeTurns} labelMap={SENTIMENT_TURN_LABELS} excludeKeys={EXCLUDED_TURN_KEYS} />
          </div>
        ) : (
          <p className="rounded-lg border border-status-good/30 bg-status-good/10 p-3 text-sm text-status-good">
            No customer experience concerns detected.
          </p>
        )}
      </div>
      <div>
        <h5 className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">All Turn-Level Sentiment Audit</h5>
        <div className="w-full max-h-80 overflow-auto scroll-hover [&>div]:overflow-visible">
          <GenericInspectorTable rows={allTurns} labelMap={SENTIMENT_TURN_LABELS} excludeKeys={EXCLUDED_TURN_KEYS} />
        </div>
      </div>
    </div>
  );
}

interface AgentPerformanceInspectorTabsProps {
  callId: string;
}

export default function AgentPerformanceInspectorTabs({ callId }: AgentPerformanceInspectorTabsProps) {
  const { data, loading, error } = useCallInspector(callId);

  if (loading) return <p className="text-sm text-text-muted">Loading Agent Performance details…</p>;
  if (error) return <p className="text-sm text-status-critical">Failed to load Agent Performance details: {error}</p>;
  if (!data) return null;

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-accent-secondary/20 pt-4">
      <TabGroup
        tabs={[
          {
            key: 'turn-level-flow',
            label: 'Turn-Level Flow',
            available: data.qualityTurns.length > 0,
            content: (
              <div className="w-full max-h-80 overflow-auto scroll-hover [&>div]:overflow-visible">
                <GenericInspectorTable rows={data.qualityTurns} labelMap={QUALITY_TURN_LABELS} excludeKeys={EXCLUDED_TURN_KEYS} />
              </div>
            ),
          },
          {
            key: 'sentiment-evidence',
            label: 'Sentiment Evidence',
            available: data.sentimentTurns.length > 0 || data.negativeSentimentTurns.length > 0,
            content: (
              <SentimentEvidencePanel
                negativeTurns={data.negativeSentimentTurns}
                allTurns={data.sentimentTurns}
              />
            ),
          },
          {
            key: 'agent-transcript',
            label: 'Transcript',
            available: data.turns.length > 0,
            content: (
              <div className="w-full max-h-80 overflow-auto [&>div]:overflow-visible">
                <TranscriptView turns={data.turns} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}