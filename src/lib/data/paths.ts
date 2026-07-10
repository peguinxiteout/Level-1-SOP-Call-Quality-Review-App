/**
 * Path builders for /public/data/output. Vite serves the public/ directory
 * at the site root, so `public/data/output/...` is fetched as
 * `/data/output/...`.
 *
 * NOTE ON LAYOUT: per-call files do NOT live flat under item_level/ and
 * turn_level/ as `{call_id}_x.csv` - the actual pipeline output nests each
 * call's most recent run under a `latest/` folder with a `_latest` suffix
 * (e.g. `item_level/CALL001/latest/CALL001_sop_items_latest.csv`), keeping
 * `versions/run_00N/` history alongside it. The paths below target that real
 * layout rather than the flat naming.
 */

const OUTPUT_ROOT = '/data/output';

export const batchPaths = {
  sopSummary: `${OUTPUT_ROOT}/batch/batch_sop_summary.csv`,
  qualitySummary: `${OUTPUT_ROOT}/batch/batch_quality_summary.csv`,
  processingTime: `${OUTPUT_ROOT}/batch/batch_processing_time.csv`,
  executiveSignals: `${OUTPUT_ROOT}/batch/batch_executive_signals.csv`,
};

export function itemLevelLatestPath(callId: string, file: 'sop_items' | 'retrieval_evidence'): string {
  return `${OUTPUT_ROOT}/item_level/${callId}/latest/${callId}_${file}_latest.csv`;
}

export function turnLevelLatestPath(
  callId: string,
  file: 'turns' | 'quality_turns' | 'sentiment_turns' | 'negative_sentiment_turns',
): string {
  return `${OUTPUT_ROOT}/turn_level/${callId}/latest/${callId}_${file}_latest.csv`;
}
