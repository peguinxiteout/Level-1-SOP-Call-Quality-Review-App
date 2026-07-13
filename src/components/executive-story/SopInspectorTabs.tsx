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

interface SopInspectorTabsProps {
  callId: string;
}

export default function SopInspectorTabs({ callId }: SopInspectorTabsProps) {
  const { data, loading, error } = useCallInspector(callId);

  if (loading) return <p className="text-sm text-text-muted">Loading SOP details…</p>;
  if (error) return <p className="text-sm text-status-critical">Failed to load SOP details: {error}</p>;
  if (!data) return null;

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-accent-secondary/20 pt-4">
      <TabGroup
        tabs={[
          {
            key: 'sop-result',
            label: 'SOP Result',
            available: data.sopItems.length > 0,
            content: (
              <div className="w-full max-h-80 overflow-auto scroll-hover [&>div]:overflow-visible">
                <SopResultTable rows={data.sopItems} />
              </div>
            ),
          },
          {
            key: 'retrieval-evidence',
            label: 'Retrieval Evidence',
            available: data.retrievalEvidence.length > 0,
            content: (
              <div className="w-full max-h-80 overflow-auto scroll-hover [&>div]:overflow-visible">
                <GenericInspectorTable
                  rows={data.retrievalEvidence}
                  labelMap={RETRIEVAL_EVIDENCE_LABELS}
                  excludeKeys={['output_version', 'output_generated_at']}
                />
              </div>
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
    </div>
  );
}