import type { ColumnWidth } from './DataTable';

/**
 * Explicit width tier per raw CSV field name, shared by every
 * GenericInspectorTable usage (Retrieval Evidence, Turn-Level Flow, and
 * Sentiment Evidence tabs on both the SOP and Agent Performance inspector
 * tab groups). Keyed by field name rather than table, since the same field
 * (e.g. call_id, agent_id, utterance) means the same thing - and should get
 * the same width - everywhere it shows up. Keys not listed fall back to
 * 'md'. Add new fields here as they're introduced so widths stay
 * deliberate instead of defaulting silently.
 *
 * xs: short IDs, ranks, scores, counts, single words/short badges.
 * sm: short labels that can be a little longer (source/method/theme names).
 * lg: genuinely free-text fields that need to wrap (queries, quotes,
 *     candidate/context text, reasons, error messages, utterances).
 */
export const INSPECTOR_FIELD_WIDTHS: Record<string, ColumnWidth> = {
  // Identity / shared header fields
  sop_call_type: 'sm',
  agent_id: 'xs',
  agent_name: 'sm',
  agent_name_confidence: 'xs',
  agent_identity_source: 'sm',
  call_id: 'xs',
  item_id: 'xs',

  // Retrieval Evidence
  rank: 'xs',
  candidate_id: 'xs',
  turn_ids: 'sm',
  agent_turn_id: 'xs',
  candidate_type: 'sm',
  retrieval_query: 'lg',
  agent_text_for_retrieval: 'lg',
  candidate_text: 'lg',
  context_text_for_evaluation: 'lg',
  key_match_score: 'xs',
  retrieval_score: 'xs',
  combined_score: 'xs',
  retrieval_method: 'sm',
  retrieval_error: 'lg',

  // Turn-Level Flow (quality turns)
  turn_id: 'xs',
  speaker: 'xs',
  start_time_sec: 'xs',
  end_time_sec: 'xs',
  duration_sec: 'xs',
  utterance: 'lg',
  role: 'xs',
  word_count: 'xs',
  duration_min: 'xs',
  wpm: 'xs',
  gap_from_previous_sec: 'xs',
  agent_response_gap_from_customer_sec: 'xs',
  overlap_with_previous_sec: 'xs',
  agent_talkover_with_previous_customer_sec: 'xs',
  customer_talkover_with_previous_agent_sec: 'xs',
  is_long_agent_turn: 'xs',

  // Sentiment Evidence
  sentiment_label: 'xs',
  sentiment_score: 'xs',
  positive_component: 'xs',
  neutral_component: 'xs',
  negative_component: 'xs',
  experience_classifier_used: 'sm',
  customer_experience_label: 'xs',
  is_customer_experience_negative: 'xs',
  customer_experience_confidence: 'xs',
  customer_experience_reason: 'md',
  customer_experience_issue_theme: 'sm',
  customer_experience_issue_pointer: 'md',
};
