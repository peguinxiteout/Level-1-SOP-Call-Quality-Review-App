/**
 * Lazy, per-call "Detailed Check" data - fetched only once a call is
 * selected, not upfront. A 404 or empty file is treated as "this inspector
 * tab has no data for this call" rather than an error: callers should gray
 * out / empty-state that tab instead of surfacing a fetch failure.
 */
import type { SopItemRow } from '../calculations/executiveStoryCalculations';
import { fetchCsvOrEmpty } from './csv';
import { itemLevelLatestPath, turnLevelLatestPath } from './paths';

export interface RetrievalEvidenceRow {
  call_id: string;
  item_id?: string;
  [column: string]: unknown;
}

export interface TurnRow {
  call_id: string;
  turn_id?: string | number;
  [column: string]: unknown;
}

export interface CallInspectorData {
  callId: string;
  sopItems: SopItemRow[];
  retrievalEvidence: RetrievalEvidenceRow[];
  turns: TurnRow[];
  qualityTurns: TurnRow[];
  sentimentTurns: TurnRow[];
  negativeSentimentTurns: TurnRow[];
}

export async function loadCallInspectorData(callId: string): Promise<CallInspectorData> {
  const [sopItems, retrievalEvidence, turns, qualityTurns, sentimentTurns, negativeSentimentTurns] = await Promise.all([
    fetchCsvOrEmpty<SopItemRow>(itemLevelLatestPath(callId, 'sop_items')),
    fetchCsvOrEmpty<RetrievalEvidenceRow>(itemLevelLatestPath(callId, 'retrieval_evidence')),
    fetchCsvOrEmpty<TurnRow>(turnLevelLatestPath(callId, 'turns')),
    fetchCsvOrEmpty<TurnRow>(turnLevelLatestPath(callId, 'quality_turns')),
    fetchCsvOrEmpty<TurnRow>(turnLevelLatestPath(callId, 'sentiment_turns')),
    fetchCsvOrEmpty<TurnRow>(turnLevelLatestPath(callId, 'negative_sentiment_turns')),
  ]);

  return { callId, sopItems, retrievalEvidence, turns, qualityTurns, sentimentTurns, negativeSentimentTurns };
}
