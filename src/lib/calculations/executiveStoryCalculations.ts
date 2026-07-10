/**
 * Standalone, dependency-free port of the "Executive Story" and
 * "SOP Adherence Metrics" tab calculations from the Python/Streamlit app
 * (app.py + core/*.py) in the SOP Adherence & Agent Performance project.
 * Both tabs share this one module since the SOP Adherence Metrics tab reuses
 * most of Executive Story's underlying functions verbatim (see the "SOP
 * Adherence Metrics additions" section near the end of this file for what's
 * new to that tab specifically).
 *
 * ZERO Python / pandas / Streamlit dependencies. Pure functions only:
 * no fetch, no file I/O, no DOM/React. Data loading and rendering happen on
 * the caller's side (e.g. a React app) - this file only computes numbers.
 *
 * INPUT SHAPE: every function takes plain arrays of row objects, i.e. the
 * shape you get back from parsing a CSV with a library like Papa Parse
 * (`Papa.parse(csvText, { header: true }).data`). Row values may arrive as
 * strings (typical for freshly-parsed CSV) or as numbers (if the caller
 * already coerced them) - every numeric read in this file goes through
 * `toNumberOrNaN`, which accepts either.
 *
 * ROUNDING NOTE: Python 3's built-in `round()` uses "round half to even"
 * (banker's rounding), which differs from JavaScript's `Math.round` (which
 * rounds half away from zero). Percentages in this domain are frequently
 * exact halves (e.g. 1/8 * 100 = 12.5), so a naive Math.round would produce
 * numbers that don't match the Python app. `pyRound` below replicates
 * Python's behavior so the ported calculations match bit-for-bit.
 *
 * MODULE FORMAT NOTE: this file is plain TypeScript (interfaces + functions,
 * no classes/enums/decorators), so it can run directly under a modern
 * Node.js runtime with built-in TypeScript support (`node thisFile.ts`), or
 * be picked up as-is by any bundler/toolchain (webpack, vite, ts-loader,
 * babel) in the destination React project. If your bundler resolves
 * relative imports without extensions, drop the ".ts" from any `import ...
 * from "./executiveStoryCalculations.ts"` you write elsewhere - Node's
 * native TS support requires the extension, most bundlers don't want it.
 */

// ---------------------------------------------------------------------------
// Row shapes (inputs) - one interface per source CSV.
// All have an index signature because the real CSVs carry many more columns
// than these functions read; the index signature keeps the type honest
// without forcing every column to be enumerated.
// ---------------------------------------------------------------------------

/** One row of batch_sop_summary.csv (one row per call). */
export interface SopSummaryRow {
  call_id: string;
  agent_id?: string;
  agent_name?: string;
  call_type?: string;
  sop_call_type?: string;
  sop_file?: string;
  sop_total_points?: number | string;
  applicable_sop_items?: number | string;
  not_applicable_sop_items?: number | string;
  confirmed_coverage_pct?: number | string;
  sop_coverage_pct?: number | string;
  confirmed_covered_points?: number | string;
  review_suggested_points?: number | string;
  missed_not_evidenced_points?: number | string;
  purpose_context_explained?: string;
  consent_availability_checked?: string;
  survey_completion_status?: string;
  proper_closure_detected?: string;
  followup_next_step_mentioned?: string;
  [column: string]: unknown;
}

/** One row of batch_sop_summary.csv AFTER addSopStatusPercentages() has run. */
export interface SopSummaryRowWithPct extends SopSummaryRow {
  confirmed_sop_checklist_item_pct?: number;
  missed_sop_checklist_item_pct?: number;
  review_sop_checklist_item_pct?: number;
  sop_checklist_coverage_incl_review_pct?: number;
  total_applicable_sop_checklist_items?: number;
}

/** One row of batch_quality_summary.csv (one row per call). */
export interface QualitySummaryRow {
  call_id: string;
  agent_id?: string;
  agent_name?: string;
  call_type?: string;
  agent_talk_ratio_pct?: number | string;
  agent_talk_ratio_band?: string;
  customer_talk_ratio_pct?: number | string;
  silence_ratio_pct?: number | string;
  silence_ratio_band?: string;
  talkover_rate_pct?: number | string;
  talkover_rate_band?: string;
  agent_talkover_rate_pct?: number | string;
  agent_talkover_rate_band?: string;
  customer_talkover_rate_pct?: number | string;
  customer_talkover_rate_band?: string;
  agent_wpm?: number | string;
  agent_wpm_band?: string;
  long_agent_turn_count?: number | string;
  audio_metrics_available?: string;
  customer_negative_turn_pct?: number | string;
  customer_negative_turn_band?: string;
  customer_experience_concern_call_flag?: string;
  [column: string]: unknown;
}

/** One row of batch_processing_time.csv (one row per call). */
export interface ProcessingTimeRow {
  call_id: string;
  agent_id?: string;
  call_type?: string;
  sop_call_type?: string;
  status?: string;
  error?: string;
  total_processing_time_sec?: number | string;
  [column: string]: unknown;
}

/** One row of a given call's `{call_id}_sop_items.csv` (one row per SOP checklist item). */
export interface SopItemRow {
  call_id: string;
  item_id?: string;
  sequence_order?: number | string;
  category?: string;
  sub_category?: string;
  item_text?: string;
  status?: string; // "Confirmed" | "Review Suggested" | "Missed / Not Evidenced" | "Not Applicable"
  evidence_turn_ids?: string;
  /** Isolated agent utterance from the top-ranked retrieval candidate for this item. See `computeActualContext`. */
  agent_evidence?: string;
  /** Broader multi-turn context window around that same top-ranked candidate. Fallback source for `computeActualContext`. */
  evidence?: string;
  [column: string]: unknown;
}

/**
 * Item-level rows grouped by call_id, e.g. `{ CALL001: [...], CALL002: [...] }`.
 * A plain `Map<string, SopItemRow[]>` is also accepted.
 */
export type ItemLevelRowsByCallId = Record<string, SopItemRow[]> | Map<string, SopItemRow[]>;

/** Sentinel used throughout the original app for "no data to compute this from". */
export type NA = "NA";

// ---------------------------------------------------------------------------
// Generic helpers (not a 1:1 port of any single Python function - small
// utilities needed to reproduce pandas semantics on plain arrays).
// ---------------------------------------------------------------------------

/**
 * Mimics `pd.to_numeric(value, errors="coerce")` for a single value: parses
 * numbers out of strings, returns NaN for anything unparsable/blank/nullish.
 */
export function toNumberOrNaN(value: unknown): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return NaN;
    const parsed = Number(trimmed);
    return parsed;
  }
  return NaN;
}

/** `toNumberOrNaN` with a fallback for NaN - mirrors pandas' `.fillna(fallback)`. */
function numberOrDefault(value: unknown, fallback: number): number {
  const num = toNumberOrNaN(value);
  return Number.isNaN(num) ? fallback : num;
}

/**
 * Replicates Python 3's built-in `round()` (round-half-to-even / banker's
 * rounding), which is what every ported calculation below uses. See the
 * "ROUNDING NOTE" at the top of this file for why this matters.
 */
export function pyRound(value: number, digits = 0): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  const shifted = value * factor;
  const floor = Math.floor(shifted);
  const diff = shifted - floor;
  const EPS = 1e-9;
  let roundedShifted: number;
  if (Math.abs(diff - 0.5) < EPS) {
    // Exact halfway point: round to the nearest even integer.
    roundedShifted = floor % 2 === 0 ? floor : floor + 1;
  } else {
    roundedShifted = Math.round(shifted);
  }
  return roundedShifted / factor;
}

/** Groups rows by the value returned from `keyFn`, preserving first-seen order. */
function groupByKeys<T>(rows: T[], keyFn: (row: T) => unknown[]): { key: unknown[]; rows: T[] }[] {
  const order: string[] = [];
  const groups = new Map<string, { key: unknown[]; rows: T[] }>();
  for (const row of rows) {
    const key = keyFn(row);
    const serialized = JSON.stringify(key);
    if (!groups.has(serialized)) {
      groups.set(serialized, { key, rows: [] });
      order.push(serialized);
    }
    groups.get(serialized)!.rows.push(row);
  }
  return order.map((serialized) => groups.get(serialized)!);
}

function pick<T extends Record<string, unknown>>(row: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = row[key];
  return out;
}

/** Outer join on `key` (like `pd.merge(..., how="outer")`), assuming no overlapping non-key columns. */
function mergeOuterOn<T extends Record<string, unknown>>(
  leftRows: T[],
  rightRows: Record<string, unknown>[],
  key: string,
): Record<string, unknown>[] {
  const rightByKey = new Map(rightRows.map((r) => [String(r[key]), r]));
  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const left of leftRows) {
    const k = String(left[key]);
    seen.add(k);
    const right = rightByKey.get(k);
    merged.push(right ? { ...left, ...right, [key]: left[key] } : { ...left });
  }
  for (const right of rightRows) {
    const k = String(right[key]);
    if (!seen.has(k)) merged.push({ ...right });
  }
  return merged;
}

/** Left join on `key` (like `pd.merge(..., how="left")`), assuming no overlapping non-key columns. */
function mergeLeftOn<T extends Record<string, unknown>>(
  leftRows: T[],
  rightRows: Record<string, unknown>[],
  key: string,
): Record<string, unknown>[] {
  const rightByKey = new Map(rightRows.map((r) => [String(r[key]), r]));
  return leftRows.map((left) => {
    const right = rightByKey.get(String(left[key]));
    return right ? { ...left, ...right, [key]: left[key] } : { ...left };
  });
}

/** True if at least one row in `rows` has `column` as an own key. */
function anyRowHasColumn(rows: Record<string, unknown>[], column: string): boolean {
  return rows.some((row) => column in row);
}

/**
 * Ported from `compact_label` (app.py:1677). Truncates long labels for
 * display, with the same "falsy value collapses to NA" quirk the Python
 * version has via `str(value or "")`.
 */
export function compactLabel(value: unknown, maxChars = 80): string {
  const text = String(value || "").trim();
  if (!text) return "NA";
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}...`;
}

/**
 * Ported from `first_value_or_na` (app.py:1671). Reads a column off the
 * first row of an (already sorted, if relevant) row array.
 */
export function firstValueOrNA(rows: Record<string, unknown>[], column: string): string {
  if (!rows.length || !(column in rows[0])) return "NA";
  const value = String(rows[0][column] || "").trim();
  return value || "NA";
}

// ---------------------------------------------------------------------------
// Band thresholds - ported from core/call_quality_metrics.py:7-41.
// These classify a raw metric value into "Good" / "Watch" / "Review" /
// "Not Available". The real batch CSVs already ship the *_band columns
// pre-computed, so you normally won't need to call these - they're here so
// the React side can recompute a band live (e.g. for a metric edited in the
// UI) without needing the Python app.
// ---------------------------------------------------------------------------

export type QualityBand = "Good" | "Watch" | "Review" | "Not Available";

/** Ported from core/call_quality_metrics.py:7 (`band_agent_talk_ratio`). */
export function bandAgentTalkRatio(value: number | ""): QualityBand {
  if (value === "") return "Not Available";
  if (value >= 35 && value <= 65) return "Good";
  if ((value >= 25 && value < 35) || (value > 65 && value <= 75)) return "Watch";
  return "Review";
}

/** Ported from core/call_quality_metrics.py:16 (`band_silence_ratio`). */
export function bandSilenceRatio(value: number | ""): QualityBand {
  if (value === "") return "Not Available";
  if (value < 10) return "Good";
  if (value <= 15) return "Watch";
  return "Review";
}

/** Ported from core/call_quality_metrics.py:25 (`band_agent_wpm`). */
export function bandAgentWpm(value: number | ""): QualityBand {
  if (value === "") return "Not Available";
  if (value >= 110 && value <= 170) return "Good";
  if ((value >= 90 && value < 110) || (value > 170 && value <= 190)) return "Watch";
  return "Review";
}

/** Ported from core/call_quality_metrics.py:34 (`band_talkover_rate`). */
export function bandTalkoverRate(value: number | ""): QualityBand {
  if (value === "") return "Not Available";
  if (value < 3) return "Good";
  if (value <= 5) return "Watch";
  return "Review";
}

/**
 * Bonus (not in the originally-requested file/line range, but feeds directly
 * into the priority-call scoring below): ported from
 * core/sentiment_metrics.py `negative_band`, which produces the
 * `customer_negative_turn_band` column consumed by buildAttentionFields.
 */
export function bandNegativeTurn(pct: number | "", role: "customer" | "agent" = "customer"): QualityBand {
  if (pct === "") return "Not Available";
  if (role === "customer") {
    if (pct < 10) return "Good";
    if (pct <= 20) return "Watch";
    return "Review";
  }
  if (pct < 5) return "Good";
  if (pct <= 10) return "Watch";
  return "Review";
}

// ---------------------------------------------------------------------------
// Ported from core/sop_metrics.py:574 (`status_for_keywords`).
// Given the item-level rows for a SINGLE call, decides whether any item
// matching the given keywords (checked against category + sub_category +
// item_text) was found, and if so whether it was covered. This is how
// batch_sop_summary.csv's purpose_context_explained / consent_availability_
// checked / proper_closure_detected / followup_next_step_mentioned columns
// are produced. Those columns already ship as plain values in
// batch_sop_summary.csv, so you only need this if you want to recompute one
// from raw `{call_id}_sop_items.csv` rows.
// ---------------------------------------------------------------------------

export function statusForKeywords(callItemRows: SopItemRow[], keywords: string[]): "Yes" | "No" | "Not Applicable" | "Not Available" {
  if (!callItemRows.length) return "Not Available";
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const matched = callItemRows.filter((row) => {
    const haystack = `${row.category ?? ""} ${row.sub_category ?? ""} ${row.item_text ?? ""}`.toLowerCase();
    return lowerKeywords.some((kw) => haystack.includes(kw));
  });
  if (!matched.length) return "Not Available";
  const applicable = matched.filter((row) => row.status !== "Not Applicable");
  if (!applicable.length) return "Not Applicable";
  return applicable.some((row) => row.status === "Confirmed" || row.status === "Review Suggested") ? "Yes" : "No";
}

// ---------------------------------------------------------------------------
// Ported from app.py:454 (`mean_or_na`).
// ---------------------------------------------------------------------------

export function meanOrNA(rows: Record<string, unknown>[], column: string, digits = 0): number | NA {
  if (!rows.length) return "NA";
  const values = rows.map((row) => toNumberOrNaN(row[column])).filter((v) => !Number.isNaN(v));
  if (!values.length) return "NA";
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return pyRound(mean, digits);
}

// ---------------------------------------------------------------------------
// Ported from app.py:482 (`add_sop_status_percentages`).
// Adds the four *_sop_checklist_item_pct columns (and
// total_applicable_sop_checklist_items) to each SOP summary row. Returns a
// NEW array; never mutates the input.
// ---------------------------------------------------------------------------

const SOP_STATUS_BASE_COLUMNS = ["confirmed_covered_points", "review_suggested_points", "missed_not_evidenced_points"] as const;

export function addSopStatusPercentages(rows: SopSummaryRow[]): SopSummaryRowWithPct[] {
  if (!rows.length) return rows as SopSummaryRowWithPct[];
  if (SOP_STATUS_BASE_COLUMNS.some((column) => !(column in rows[0]))) {
    return rows as SopSummaryRowWithPct[];
  }

  return rows.map((row) => {
    const confirmed = numberOrDefault(row.confirmed_covered_points, 0);
    const review = numberOrDefault(row.review_suggested_points, 0);
    const missed = numberOrDefault(row.missed_not_evidenced_points, 0);
    const total = confirmed + review + missed;
    const valid = total > 0;

    const confirmedPct = valid ? pyRound((confirmed / total) * 100, 2) : 0.0;
    const missedPct = valid ? pyRound((missed / total) * 100, 2) : 0.0;
    const reviewPct = valid ? pyRound((review / total) * 100, 2) : 0.0;
    const coverageInclReviewPct = valid ? pyRound(confirmedPct + reviewPct, 2) : 0.0;

    return {
      ...row,
      confirmed_sop_checklist_item_pct: confirmedPct,
      missed_sop_checklist_item_pct: missedPct,
      review_sop_checklist_item_pct: reviewPct,
      sop_checklist_coverage_incl_review_pct: coverageInclReviewPct,
      total_applicable_sop_checklist_items: total,
    };
  });
}

// ---------------------------------------------------------------------------
// Ported from app.py:1553 (`build_ui_sop_area_summary`).
// Groups a batch's item-level rows by (category, sub_category) and computes
// coverage/non-adherence stats per group. Feeds categoryCoveragePct and the
// "Most Non-Adherence Area" KPI.
// ---------------------------------------------------------------------------

export interface SopAreaSummaryRow {
  category: string;
  sub_category: string;
  total_sop_items: number;
  applicable_sop_items: number;
  confirmed_count: number;
  review_suggested_count: number;
  sop_adherence_count: number;
  missed_count: number;
  non_adherence_count: number;
  not_applicable_count: number;
  coverage_pct: number;
  missed_pct: number;
  non_adherence_pct: number;
  non_adherence_share_pct: number;
  [column: string]: unknown;
}

export function buildUiSopAreaSummary(itemRows: SopItemRow[]): SopAreaSummaryRow[] {
  if (!itemRows.length || !("status" in itemRows[0])) return [];
  const hasSubCategory = "sub_category" in itemRows[0];
  if (!("category" in itemRows[0]) && !hasSubCategory) return [];

  const groups = groupByKeys(itemRows, (row) => (hasSubCategory ? [row.category, row.sub_category] : [row.category]));

  const rows: SopAreaSummaryRow[] = groups.map(({ key, rows: group }) => {
    const applicable = group.filter((row) => String(row.status) !== "Not Applicable");
    const confirmed = applicable.filter((row) => row.status === "Confirmed").length;
    const review = applicable.filter((row) => row.status === "Review Suggested").length;
    const missed = applicable.filter((row) => row.status === "Missed / Not Evidenced").length;
    const adherence = confirmed + review;
    const applicableCount = applicable.length;

    return {
      category: (key[0] as string) ?? "",
      sub_category: (key[1] as string) ?? "",
      total_sop_items: group.length,
      applicable_sop_items: applicableCount,
      confirmed_count: confirmed,
      review_suggested_count: review,
      sop_adherence_count: adherence,
      missed_count: missed,
      non_adherence_count: missed,
      not_applicable_count: group.filter((row) => row.status === "Not Applicable").length,
      coverage_pct: applicableCount ? pyRound((adherence / applicableCount) * 100, 2) : 0.0,
      missed_pct: applicableCount ? pyRound((missed / applicableCount) * 100, 2) : 0.0,
      non_adherence_pct: applicableCount ? pyRound((missed / applicableCount) * 100, 2) : 0.0,
      non_adherence_share_pct: 0.0, // filled in below, once the batch total is known
    };
  });

  const totalNonAdherence = rows.reduce((sum, row) => sum + row.non_adherence_count, 0);
  for (const row of rows) {
    row.non_adherence_share_pct = totalNonAdherence ? pyRound((row.non_adherence_count / totalNonAdherence) * 100, 2) : 0.0;
  }

  return [...rows].sort((a, b) => b.non_adherence_count - a.non_adherence_count || b.non_adherence_pct - a.non_adherence_pct);
}

// ---------------------------------------------------------------------------
// Ported from app.py:1689 (`category_coverage_pct`).
// Takes the OUTPUT of buildUiSopAreaSummary (not raw item rows) and a
// category name (case-insensitive), and returns that category's coverage %.
//
// NOTE: in the live app, the "Middle Section SOP Adherence" KPI card is
// computed by calling this with categoryName="Survey" - the UI label
// ("Middle Section") and the underlying SOP category name ("Survey") differ.
// computeKpiSummary below preserves this exactly; don't "fix" it when you
// wire this up, it matches the real SOP category taxonomy.
// ---------------------------------------------------------------------------

export function categoryCoveragePct(areaRows: SopAreaSummaryRow[], categoryName: string): number | NA {
  if (!areaRows.length) return "NA";
  const target = categoryName.toLowerCase();
  const subset = areaRows.filter((row) => String(row.category ?? "").trim().toLowerCase() === target);
  if (!subset.length) return "NA";

  const applicable = subset.reduce((sum, row) => sum + numberOrDefault(row.applicable_sop_items, 0), 0);
  const confirmed = subset.reduce((sum, row) => sum + numberOrDefault(row.confirmed_count, 0), 0);
  const review = subset.reduce((sum, row) => sum + numberOrDefault(row.review_suggested_count, 0), 0);
  if (applicable <= 0) return "NA";

  return pyRound(((confirmed + review) / applicable) * 100, 2);
}

// ---------------------------------------------------------------------------
// Ported from app.py:1594 (`build_ui_frequent_non_adherence`).
// Groups item-level rows (across the whole batch) by
// (category, sub_category, item_text) among Missed/Review-Suggested items,
// to find the most frequently non-adhered-to SOP items.
// ---------------------------------------------------------------------------

export interface FrequentNonAdherenceRow {
  category: string;
  sub_category: string;
  item_text: string;
  missed_count: number;
  review_suggested_count: number;
  non_adherence_count: number;
  affected_call_count: number;
  affected_call_pct: number;
  [column: string]: unknown;
}

export function buildUiFrequentNonAdherence(
  itemRows: SopItemRow[],
  statuses: string[] = ["Missed / Not Evidenced", "Review Suggested"],
): FrequentNonAdherenceRow[] {
  if (!itemRows.length || !("status" in itemRows[0])) return [];

  const hasCallId = "call_id" in itemRows[0];
  const totalCalls = hasCallId ? new Set(itemRows.map((row) => String(row.call_id))).size : 0;

  const filtered = itemRows.filter((row) => statuses.includes(String(row.status)));
  if (!filtered.length) return [];

  const groupCols = ["category", "sub_category", "item_text"].filter((col) => col in itemRows[0]);
  const groups = groupByKeys(filtered, (row) => groupCols.map((col) => row[col]));

  const rows: FrequentNonAdherenceRow[] = groups.map(({ key, rows: group }) => {
    const values: Record<string, unknown> = {};
    groupCols.forEach((col, i) => (values[col] = key[i]));
    const affectedCalls = hasCallId ? new Set(group.map((row) => String(row.call_id))).size : group.length;
    const missed = group.filter((row) => row.status === "Missed / Not Evidenced").length;
    const review = group.filter((row) => row.status === "Review Suggested").length;

    return {
      category: (values.category as string) ?? "",
      sub_category: (values.sub_category as string) ?? "",
      item_text: (values.item_text as string) ?? "",
      missed_count: missed,
      review_suggested_count: review,
      non_adherence_count: missed + review,
      affected_call_count: affectedCalls,
      affected_call_pct: totalCalls ? pyRound((affectedCalls / totalCalls) * 100, 2) : 0.0,
    };
  });

  return rows.sort((a, b) => b.non_adherence_count - a.non_adherence_count || b.affected_call_count - a.affected_call_count);
}

// ---------------------------------------------------------------------------
// Ported from app.py:1622 (`build_ui_sequence_summary`).
// Per call, checks whether SOP items were covered in the order the SOP
// defines (sequence_order) by comparing it against the order evidence
// actually appeared in the transcript (first turn id in evidence_turn_ids).
// ---------------------------------------------------------------------------

export interface SequenceSummaryRow {
  call_id: string;
  evidenced_sop_items: number;
  sequence_break_count: number;
  sequence_followed_pct: number;
  first_sequence_break: string;
  [column: string]: unknown;
}

/** Ported from the nested `sequence_label` closure inside build_ui_sequence_summary. */
function sequenceLabel(row: SopItemRow): string {
  const text = String(row.item_text || "").trim();
  if (text) return compactLabel(text, 90);
  return String(row.item_id || "").trim();
}

export function buildUiSequenceSummary(itemRows: SopItemRow[]): SequenceSummaryRow[] {
  if (!itemRows.length || !("call_id" in itemRows[0]) || !("status" in itemRows[0])) return [];

  const groups = groupByKeys(itemRows, (row) => [row.call_id]);
  const results: SequenceSummaryRow[] = [];

  for (const { key, rows: group } of groups) {
    const callId = String(key[0] ?? "");
    const applicable = group.filter((row) => row.status === "Confirmed" || row.status === "Review Suggested");
    if (!applicable.length) {
      results.push({
        call_id: callId,
        evidenced_sop_items: 0,
        sequence_break_count: 0,
        sequence_followed_pct: 0.0,
        first_sequence_break: "",
      });
      continue;
    }

    const withOrdering = applicable
      .map((row) => {
        const sequenceOrderNum = toNumberOrNaN(row.sequence_order);
        const firstTurnRaw = String(row.evidence_turn_ids ?? "").split(",")[0];
        const firstEvidenceTurnId = toNumberOrNaN(firstTurnRaw);
        return { row, sequenceOrderNum, firstEvidenceTurnId };
      })
      .filter((entry) => !Number.isNaN(entry.sequenceOrderNum) && !Number.isNaN(entry.firstEvidenceTurnId))
      .sort((a, b) => a.sequenceOrderNum - b.sequenceOrderNum);

    const breaks: string[] = [];
    let lastTurn: number | null = null;
    let lastItem = "";
    for (const entry of withOrdering) {
      const currentTurn = entry.firstEvidenceTurnId;
      if (lastTurn !== null && currentTurn < lastTurn) {
        const currentItem = sequenceLabel(entry.row);
        if (currentItem && lastItem) {
          breaks.push(`"${currentItem}" appeared before "${lastItem}".`);
        } else {
          breaks.push(`${entry.row.item_id ?? ""} before/overlaps after ${lastItem}`);
        }
      }
      lastTurn = currentTurn;
      lastItem = sequenceLabel(entry.row);
    }

    const evidenced = withOrdering.length;
    const breakCount = breaks.length;
    results.push({
      call_id: callId,
      evidenced_sop_items: evidenced,
      sequence_break_count: breakCount,
      sequence_followed_pct: evidenced ? pyRound(((evidenced - breakCount) / evidenced) * 100, 2) : 0.0,
      first_sequence_break: breaks[0] ?? "",
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Ported from app.py:1702 (`pct_calls_with_metric_above_zero`) and
// app.py:1710 (`pct_calls_with_yes_flag`). Both feed the
// "Calls Having Customer Concerns" KPI.
// ---------------------------------------------------------------------------

export function pctCallsWithMetricAboveZero(rows: Record<string, unknown>[], column: string): number | NA {
  if (!rows.length || !(column in rows[0])) return "NA";
  const values = rows.map((row) => toNumberOrNaN(row[column])).filter((v) => !Number.isNaN(v));
  if (!values.length) return "NA";
  return pyRound((values.filter((v) => v > 0).length / values.length) * 100, 2);
}

export function pctCallsWithYesFlag(rows: Record<string, unknown>[], column: string): number | NA {
  if (!rows.length || !(column in rows[0])) return "NA";
  const values = rows
    .map((row) => row[column])
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map((v) => String(v).trim().toLowerCase());
  if (!values.length) return "NA";
  return pyRound((values.filter((v) => ["yes", "true", "1"].includes(v)).length / values.length) * 100, 2);
}

// ---------------------------------------------------------------------------
// Ported from app.py:325 (`with_agent_context_columns`).
// Renames a fixed set of quality-metric columns to the friendlier
// "agent_..." names used in the Agent Performance Drilldown and priority
// tables. Returns NEW row objects; never mutates the input.
// ---------------------------------------------------------------------------

const AGENT_CONTEXT_RENAME_MAP: Record<string, string> = {
  agent_talk_ratio_pct: "agent_talktime_pct",
  agent_talk_ratio_band: "agent_talktime_band",
  silence_ratio_pct: "agent_silence_pct",
  silence_ratio_band: "agent_silence_band",
  agent_talkover_rate_pct: "agent_talkover_pct",
  agent_talkover_rate_band: "agent_talkover_band",
};

export function withAgentContextColumns<T extends Record<string, unknown>>(rows: T[]): Record<string, unknown>[] {
  if (!rows.length) return rows;
  const activeMap = Object.entries(AGENT_CONTEXT_RENAME_MAP).filter(([oldKey]) => oldKey in rows[0]);

  return rows.map((row) => {
    const renamed: Record<string, unknown> = { ...row };
    for (const [oldKey, newKey] of activeMap) {
      renamed[newKey] = renamed[oldKey];
      delete renamed[oldKey];
    }
    return renamed;
  });
}

// ---------------------------------------------------------------------------
// Ported from app.py:1073 (`build_attention_fields`).
// Given one merged call row (SOP + quality + timing fields), derives why a
// call needs attention, what to do about it, and how severe that is.
// ---------------------------------------------------------------------------

export type PriorityLevel = "OK" | "Medium" | "High";

export interface AttentionFields {
  priority_level: PriorityLevel;
  attention_reason: string;
  recommended_action: string;
}

const BAND_ACTIONS: Record<string, string> = {
  agent_talk_ratio_band: "Check agent talk/listen balance",
  silence_ratio_band: "Check agent silence",
  customer_negative_turn_band: "Check raw negative sentiment moments",
};

const BAND_LABELS: Record<string, string> = {
  agent_talk_ratio_band: "agent talk ratio",
  silence_ratio_band: "agent silence",
  customer_negative_turn_band: "raw negative sentiment",
};

export function buildAttentionFields(row: Record<string, unknown>): AttentionFields {
  const reasons: string[] = [];
  const actions: string[] = [];
  let severity: PriorityLevel = "OK";

  const missed = numberOrDefault(row.missed_not_evidenced_points, 0);
  const coverageRaw = row.sop_checklist_coverage_incl_review_pct ?? row.sop_coverage_pct ?? 100;
  const coverage = numberOrDefault(coverageRaw, 100);

  const sopParts: string[] = [];
  if (missed > 0) {
    sopParts.push(`${Math.trunc(missed)} missed`);
    actions.push("Check missed SOP evidence");
    severity = "High";
  }
  if (coverage < 70) {
    sopParts.push(`${pyRound(coverage, 0)}% coverage`);
    actions.push("Coach on SOP adherence");
    severity = "High";
  }
  if (sopParts.length) {
    reasons.push("SOP: " + sopParts.join(", "));
  }

  if (String(row.status ?? "") === "Failed") {
    const errorText = String(row.error ?? "").trim();
    reasons.push(`Processing failed${errorText ? ": " + errorText.slice(0, 80) : ""}`);
    actions.push("Fix input/error and rerun this call");
    severity = "High";
  }

  for (const [bandCol, action] of Object.entries(BAND_ACTIONS)) {
    const band = String(row[bandCol] ?? "");
    if (band === "Review") {
      const label = BAND_LABELS[bandCol] ?? bandCol.replace(/_band$/, "").replace(/_/g, " ");
      reasons.push(`${label}: ${band}`);
      actions.push(action);
      if (severity === "OK") severity = "Medium";
    }
  }

  if (String(row.audio_metrics_available ?? "") === "Error") {
    reasons.push("Audio metrics error");
    actions.push("Check audio file format if audio analysis is needed");
    if (severity === "OK") severity = "Medium";
  }

  if (!reasons.length) {
    reasons.push("No immediate issue");
    actions.push("No action needed");
  }

  return {
    priority_level: severity,
    attention_reason: [...new Set(reasons)].join("; "),
    recommended_action: [...new Set(actions)].join("; "),
  };
}

// ---------------------------------------------------------------------------
// Ported from the merge/scoring logic in app.py:1751-1817
// (`render_priority_actions_section`), minus the Streamlit rendering.
// ---------------------------------------------------------------------------

export interface PriorityCallRow extends AttentionFields {
  attention_score: number;
  call_id?: string;
  agent_id?: string;
  call_type?: string;
  sop_checklist_coverage_incl_review_pct?: number | string;
  agent_talktime_pct?: number | string;
  agent_talktime_band?: string;
  agent_silence_pct?: number | string;
  agent_silence_band?: string;
  agent_talkover_pct?: number | string;
  agent_talkover_band?: string;
  customer_experience_concern_call_flag?: string;
  audio_metrics_available?: string;
  status?: string;
  [column: string]: unknown;
}

const TIMING_MERGE_COLUMNS = ["call_id", "status", "error", "total_processing_time_sec"];
const QUALITY_MERGE_COLUMNS = [
  "call_id",
  "agent_talk_ratio_pct",
  "agent_talk_ratio_band",
  "silence_ratio_pct",
  "silence_ratio_band",
  "customer_negative_turn_pct",
  "customer_negative_turn_band",
  "customer_experience_concern_call_flag",
  "agent_talkover_rate_pct",
  "agent_talkover_rate_band",
  "audio_metrics_available",
];

/**
 * The fields displayed in the live "Top 5 Calls" table (app.py:1799-1809).
 * NOTE: the live Streamlit table's own column list does NOT include
 * "recommended_action" (that's a genuine quirk of app.py, not a copy error -
 * recommended_action is computed but never added to `preferred`/`display_cols`
 * there). computePriorityCalls below always includes attention_score,
 * priority_level, attention_reason AND recommended_action regardless, since
 * the ported function's contract calls for all four explicitly.
 */
const PRIORITY_DISPLAY_COLUMNS = [
  "call_id",
  "agent_id",
  "call_type",
  "sop_checklist_coverage_incl_review_pct",
  "attention_reason",
  "priority_level",
  "agent_talk_ratio_pct",
  "agent_talk_ratio_band",
  "silence_ratio_pct",
  "silence_ratio_band",
  "customer_experience_concern_call_flag",
  "agent_talkover_rate_pct",
  "agent_talkover_rate_band",
  "audio_metrics_available",
  "status",
];

export function computePriorityCalls(
  sopRows: SopSummaryRow[],
  qualityRows: QualitySummaryRow[],
  timingRows: ProcessingTimeRow[],
): PriorityCallRow[] {
  const sopDf = addSopStatusPercentages(sopRows);

  const timingHasCallId = timingRows.length > 0 && "call_id" in timingRows[0];
  const timingSubset = timingHasCallId
    ? timingRows.map((row) => pick(row, TIMING_MERGE_COLUMNS.filter((col) => col in row)))
    : [];

  let priorityRows: Record<string, unknown>[] = timingHasCallId ? timingSubset : [];
  if (sopDf.length) {
    priorityRows = sopDf.map((row) => ({ ...row }));
    if (timingHasCallId) {
      priorityRows = mergeOuterOn(priorityRows, timingSubset, "call_id");
    }
  }

  if (qualityRows.length) {
    const presentQualityCols = QUALITY_MERGE_COLUMNS.filter((col) => qualityRows.some((row) => col in row));
    const qualitySubset = qualityRows.map((row) => pick(row, presentQualityCols));
    priorityRows = priorityRows.length ? mergeLeftOn(priorityRows, qualitySubset, "call_id") : qualitySubset;
  }

  if (!priorityRows.length) return [];

  for (const row of priorityRows) row.attention_score = 0;

  if (anyRowHasColumn(priorityRows, "missed_not_evidenced_points")) {
    for (const row of priorityRows) {
      (row.attention_score as number) += numberOrDefault(row.missed_not_evidenced_points, 0) * 3;
    }
  }

  const coverageCol = anyRowHasColumn(priorityRows, "sop_checklist_coverage_incl_review_pct")
    ? "sop_checklist_coverage_incl_review_pct"
    : "sop_coverage_pct";
  if (anyRowHasColumn(priorityRows, coverageCol)) {
    for (const row of priorityRows) {
      (row.attention_score as number) += (100 - numberOrDefault(row[coverageCol], 100)) / 10;
    }
  }

  for (const bandCol of ["agent_talk_ratio_band", "silence_ratio_band"]) {
    if (anyRowHasColumn(priorityRows, bandCol)) {
      for (const row of priorityRows) {
        (row.attention_score as number) += String(row[bandCol] ?? "") === "Review" ? 2 : 0;
      }
    }
  }

  if (anyRowHasColumn(priorityRows, "status")) {
    for (const row of priorityRows) {
      (row.attention_score as number) += String(row.status ?? "") === "Failed" ? 10 : 0;
    }
  }

  for (const row of priorityRows) {
    Object.assign(row, buildAttentionFields(row));
  }

  const displayCols = PRIORITY_DISPLAY_COLUMNS.filter((col) => anyRowHasColumn(priorityRows, col));

  const sorted = [...priorityRows].sort((a, b) => (b.attention_score as number) - (a.attention_score as number));
  const actionRows = sorted.filter((row) => row.priority_level === "High" || row.priority_level === "Medium").slice(0, 5);

  const trimmed = actionRows.map((row) => {
    const out: Record<string, unknown> = {
      attention_score: row.attention_score,
      priority_level: row.priority_level,
      attention_reason: row.attention_reason,
      recommended_action: row.recommended_action,
    };
    for (const col of displayCols) out[col] = row[col];
    return out;
  });

  return withAgentContextColumns(trimmed) as PriorityCallRow[];
}

// ---------------------------------------------------------------------------
// Ported from the Executive Story KPI tiles in app.py:1835-1884
// (`render_executive_story`, the c1..c12 metric_card calls), minus the
// Streamlit rendering.
// ---------------------------------------------------------------------------

export interface KpiSummary {
  /** c1 "Calls Analyzed": len(timing_df) if present, else max(len(sop_df), len(quality_df)). */
  callsAnalyzed: number;
  /** c2 "Avg SOP Adherence": mean of sop_checklist_coverage_incl_review_pct. */
  avgSopAdherencePct: number | NA;
  /** c3 "Opening SOP Adherence": categoryCoveragePct(areaRows, "Opening"). */
  openingSopAdherencePct: number | NA;
  /** c4 "Middle Section SOP Adherence": categoryCoveragePct(areaRows, "Survey") - see categoryCoveragePct's note on this name mismatch. */
  middleSectionSopAdherencePct: number | NA;
  /** c5 "Closure SOP Adherence": categoryCoveragePct(areaRows, "Closure"). */
  closureSopAdherencePct: number | NA;
  /** c6 "Avg SOP Sequence Followed": mean of sequence_followed_pct across calls. */
  avgSopSequenceFollowedPct: number | NA;
  /** c7 "Most Non-Adherence Area": label half of the tile (sub_category of the worst-offending area). */
  mostNonAdherenceAreaLabel: string;
  /** c7 "Most Non-Adherence Area": percentage half of the tile. */
  mostNonAdherenceAreaPct: number | NA;
  /** c8 "Most Frequent Missed SOP": label half of the tile (item_text of the most-missed item). */
  mostFrequentMissedSopLabel: string;
  /** c8 "Most Frequent Missed SOP": percentage half of the tile (% of calls affected). */
  mostFrequentMissedSopCallPct: number | NA;
  /** c9 "Calls Having Customer Concerns". */
  callsHavingCustomerConcernsPct: number | NA;
  /** c10 "Avg Agent Talktime". */
  avgAgentTalktimePct: number | NA;
  /** c11 "Avg Agent Silence". */
  avgAgentSilencePct: number | NA;
  /** c12 "Avg Agent Talk-over Rate". */
  avgAgentTalkoverRatePct: number | NA;
}

/** Flattens the per-call item-level rows for every call in `sopRows` into one array, like app.py's `load_sop_item_details` + `pd.concat`. */
function flattenItemLevelRows(sopRows: SopSummaryRow[], itemLevelRowsByCallId: ItemLevelRowsByCallId): SopItemRow[] {
  const lookup =
    itemLevelRowsByCallId instanceof Map
      ? (callId: string) => itemLevelRowsByCallId.get(callId)
      : (callId: string) => itemLevelRowsByCallId[callId];

  const combined: SopItemRow[] = [];
  for (const row of sopRows) {
    const callId = row.call_id === undefined || row.call_id === null ? "" : String(row.call_id);
    if (!callId) continue;
    const itemRows = lookup(callId);
    if (itemRows && itemRows.length) combined.push(...itemRows);
  }
  return combined;
}

export function computeKpiSummary(
  sopRows: SopSummaryRow[],
  qualityRows: QualitySummaryRow[],
  timingRows: ProcessingTimeRow[],
  itemLevelRowsByCallId: ItemLevelRowsByCallId = {},
): KpiSummary {
  const sopDf = addSopStatusPercentages(sopRows);
  const callsAnalyzed = timingRows.length ? timingRows.length : Math.max(sopDf.length, qualityRows.length);

  const itemRows = flattenItemLevelRows(sopDf, itemLevelRowsByCallId);
  const areaRows = buildUiSopAreaSummary(itemRows);
  const frequentRows = buildUiFrequentNonAdherence(itemRows);
  const sequenceRows = buildUiSequenceSummary(itemRows);

  let callsHavingCustomerConcernsPct = pctCallsWithYesFlag(qualityRows, "customer_experience_concern_call_flag");
  if (callsHavingCustomerConcernsPct === "NA") {
    callsHavingCustomerConcernsPct = pctCallsWithMetricAboveZero(qualityRows, "customer_negative_turn_pct");
  }

  const weakestAreaLabel = firstValueOrNA(areaRows, "sub_category");
  const weakestAreaPctRaw = firstValueOrNA(areaRows, "non_adherence_pct");
  const frequentItemLabel = firstValueOrNA(frequentRows, "item_text");
  const frequentItemPctRaw = firstValueOrNA(frequentRows, "affected_call_pct");

  return {
    callsAnalyzed,
    avgSopAdherencePct: meanOrNA(sopDf, "sop_checklist_coverage_incl_review_pct"),
    openingSopAdherencePct: categoryCoveragePct(areaRows, "Opening"),
    middleSectionSopAdherencePct: categoryCoveragePct(areaRows, "Survey"),
    closureSopAdherencePct: categoryCoveragePct(areaRows, "Closure"),
    avgSopSequenceFollowedPct: meanOrNA(sequenceRows, "sequence_followed_pct"),
    mostNonAdherenceAreaLabel: weakestAreaLabel === "NA" ? "NA" : compactLabel(weakestAreaLabel),
    mostNonAdherenceAreaPct: weakestAreaLabel === "NA" || weakestAreaPctRaw === "NA" ? "NA" : Number(weakestAreaPctRaw),
    mostFrequentMissedSopLabel: frequentItemLabel === "NA" ? "NA" : compactLabel(frequentItemLabel),
    mostFrequentMissedSopCallPct: frequentItemLabel === "NA" || frequentItemPctRaw === "NA" ? "NA" : Number(frequentItemPctRaw),
    callsHavingCustomerConcernsPct,
    avgAgentTalktimePct: meanOrNA(qualityRows, "agent_talk_ratio_pct"),
    avgAgentSilencePct: meanOrNA(qualityRows, "silence_ratio_pct"),
    avgAgentTalkoverRatePct: meanOrNA(qualityRows, "agent_talkover_rate_pct"),
  };
}

// ---------------------------------------------------------------------------
// Bonus display helper - NOT a strict port of app.py's `format_ui_value`
// (which also re-parses already-formatted table-cell strings for a couple
// of other tabs; that part is display/UI concerned and out of scope here).
// This covers the common case: a numeric KPI value (or "NA") that needs a
// whole-number, percent-suffixed display string, matching what the
// Streamlit tiles show. Handy for the validation script below, and usable
// as-is on the React side if convenient.
// ---------------------------------------------------------------------------

export function formatPercentValue(value: number | NA): string {
  if (value === "NA" || value === null || value === undefined || Number.isNaN(value as number)) return "NA";
  return `${pyRound(value as number, 0)}%`;
}

// ---------------------------------------------------------------------------
// SOP Adherence Metrics tab additions.
//
// This tab (render_sop_tab, app.py:2171) reuses KPI cards 2-8, buildUiSopAreaSummary,
// and buildUiFrequentNonAdherence completely unchanged from Executive Story -
// nothing new to port for those (call the functions above directly). The four
// functions below cover what's genuinely different on this tab:
//
//  - computeCallsProcessed        -> KPI card 1, a DIFFERENT number than
//                                     computeKpiSummary's callsAnalyzed
//  - computeSopAreaFull / computeFrequentNonAdherenceFull
//                                  -> thin wrappers that expose the FULL
//                                     buildUiSopAreaSummary / buildUiFrequentNonAdherence
//                                     arrays (Executive Story only ever reads row 0
//                                     of each, via firstValueOrNA, for its KPI tiles)
//  - computeSequenceAdherenceDetail -> the "Calls With Lowest SOP Sequence
//                                     Adherence" table: buildUiSequenceSummary's
//                                     per-call output, sorted worst-first
//  - getSopOnlyCallList            -> the call selector for this tab's "Detailed
//                                     Check" dropdown (SOP-only, not the
//                                     SOP-union-quality list Executive Story's
//                                     equivalent selector would need)
// ---------------------------------------------------------------------------

/**
 * Ported from app.py:2188 (`render_sop_tab`, "Calls Processed" KPI card):
 * `metric_card("Calls Processed", len(df))` where `df` is the (already
 * dashboard-filtered) batch_sop_summary.csv rows - i.e. just `sopRows.length`.
 *
 * NOT the same computation as computeKpiSummary's `callsAnalyzed` ("Calls
 * Analyzed" on Executive Story), which counts `timingRows` instead (falling
 * back to `max(sopRows.length, qualityRows.length)` only if there are no
 * timing rows at all - see app.py:1836). The two numbers can legitimately
 * differ: a call can have a processing-time row without ever producing a SOP
 * summary row (e.g. it failed before SOP comparison ran), in which case
 * Executive Story's count includes it and this one doesn't. Keep them
 * computed independently; don't merge or substitute one for the other.
 */
export function computeCallsProcessed(sopRows: SopSummaryRow[]): number {
  return sopRows.length;
}

/**
 * Full `buildUiSopAreaSummary` output (app.py:1553) for every call in
 * `sopRows`, i.e. the "SOP Area Adherence" table (app.py:2218-2224). This is
 * the exact same computation Executive Story uses for its "Opening/Middle/
 * Closure SOP Adherence" tiles and "Most Non-Adherence Area" KPI
 * (`computeKpiSummary` internally calls `buildUiSopAreaSummary` too) - the
 * only difference is Executive Story discards every row but the first
 * (via `firstValueOrNA`). This wrapper just does the same item-row
 * flattening `computeKpiSummary` does and returns the whole array, unsorted
 * further (already sorted worst-first by `buildUiSopAreaSummary` itself).
 */
export function computeSopAreaFull(
  sopRows: SopSummaryRow[],
  itemLevelRowsByCallId: ItemLevelRowsByCallId = {},
): SopAreaSummaryRow[] {
  return buildUiSopAreaSummary(flattenItemLevelRows(sopRows, itemLevelRowsByCallId));
}

/**
 * Full `buildUiFrequentNonAdherence` output (app.py:1594) for every call in
 * `sopRows`, i.e. the "Recurring SOP Non-Adherence" table (app.py:2226-2232).
 * Same relationship to Executive Story as `computeSopAreaFull` above:
 * identical underlying computation, Executive Story just reads row 0 for its
 * "Most Frequent Missed SOP" KPI.
 */
export function computeFrequentNonAdherenceFull(
  sopRows: SopSummaryRow[],
  itemLevelRowsByCallId: ItemLevelRowsByCallId = {},
): FrequentNonAdherenceRow[] {
  return buildUiFrequentNonAdherence(flattenItemLevelRows(sopRows, itemLevelRowsByCallId));
}

/**
 * Lexicographic string compare matching Python's default `str.__lt__`
 * (comparison by Unicode code point) and pandas' default ascending
 * `sort_values` tie-break on a string column - used below in place of
 * `localeCompare`, whose locale-aware collation can order strings
 * differently than plain code-point comparison for some inputs.
 */
function compareStringsAscending(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Ported from app.py:2234-2244 (`render_sop_tab`'s "Calls With Lowest SOP
 * Sequence Adherence" expander): runs `build_ui_sequence_summary` (already
 * ported as `buildUiSequenceSummary` above - same adjacent-pair break
 * detection and quoted `item_text` sentence construction for
 * `first_sequence_break`, e.g. `"Introduce yourself and your team" appeared
 * before "Greet the customer politely".`) and then applies the same sort the
 * live app does:
 *
 * ```python
 * sequence_df.assign(_sort=pd.to_numeric(sequence_df["sequence_followed_pct"], errors="coerce"))
 *            .sort_values(["_sort", "call_id"], ascending=[True, True])
 * ```
 *
 * i.e. ascending by `sequence_followed_pct` (worst/lowest adherence first),
 * tied calls broken by `call_id` ascending. There is NO row limit applied on
 * this table in the live app (unlike the 5-row-capped Priority Calls table) -
 * every call is returned; the caller decides how many rows to actually show.
 * Rows whose `sequence_followed_pct` fails to parse as a number sort last
 * (matching pandas' default `na_position="last"`), though in practice
 * `buildUiSequenceSummary` always produces a numeric value here.
 */
export function computeSequenceAdherenceDetail(
  sopRows: SopSummaryRow[],
  itemLevelRowsByCallId: ItemLevelRowsByCallId = {},
): SequenceSummaryRow[] {
  const itemRows = flattenItemLevelRows(sopRows, itemLevelRowsByCallId);
  const sequenceRows = buildUiSequenceSummary(itemRows);

  return [...sequenceRows].sort((a, b) => {
    const aPct = toNumberOrNaN(a.sequence_followed_pct);
    const bPct = toNumberOrNaN(b.sequence_followed_pct);
    const aIsNaN = Number.isNaN(aPct);
    const bIsNaN = Number.isNaN(bPct);
    if (aIsNaN !== bIsNaN) return aIsNaN ? 1 : -1;
    if (!aIsNaN && aPct !== bPct) return aPct - bPct;
    return compareStringsAscending(String(a.call_id), String(b.call_id));
  });
}

/**
 * Ported from app.py:2246 (`render_sop_tab`'s "Detailed Check" call
 * selector): `sorted(df["call_id"].dropna().astype(str).unique().tolist())`
 * where `df` is the batch_sop_summary.csv rows - SOP-only calls.
 *
 * This is deliberately NOT the same list as Executive Story's detail
 * selector (`detail_call_ids` in app.py, built from
 * `set(sop_df.call_id) | set(quality_df.call_id)` - a union with the quality
 * summary's calls). That union isn't ported in this module yet; when it is,
 * it should be its own function (e.g. `getSopAndQualityCallList`) rather than
 * folding a toggle into this one, so this SOP-only list keeps behaving
 * exactly like app.py:2246 regardless.
 */
export function getSopOnlyCallList(sopRows: SopSummaryRow[]): string[] {
  if (!sopRows.length || !("call_id" in sopRows[0])) return [];
  const ids = new Set<string>();
  for (const row of sopRows) {
    const callId = row.call_id === undefined || row.call_id === null ? "" : String(row.call_id);
    if (!callId) continue; // pandas reads a blank CSV cell as NaN, which dropna() then removes
    ids.add(callId);
  }
  return [...ids].sort(compareStringsAscending);
}

// ---------------------------------------------------------------------------
// Ported from app.py:2096-2132 (`show_sop_detail`), specifically the
// "Actual Context" fallback logic at app.py:2110-2115. This is the function
// behind the "SOP Result" sub-tab of "Detailed Check", shared verbatim by
// both the Executive Story tab (app.py:1944) and the SOP Adherence Metrics
// tab (app.py:2257).
//
// `actual_context` is NOT a pre-computed column sitting in
// `{call_id}_sop_items.csv` - it is synthesized at render time from two
// columns that ARE already in that CSV (written by
// `core/sop_metrics.py:511-549`, one row per SOP checklist item):
//   - `agent_evidence`: the isolated agent utterance text from the
//     top-ranked (rank 1 / highest combined_score) retrieval candidate for
//     that item (`core/retrieval_engine.py`'s `agent_text_for_retrieval`).
//   - `evidence`: the broader multi-turn context window (customer + agent
//     lines, ~1 turn before / 5 turns after) around that same top-ranked
//     candidate (`candidate_text` / `context_text_for_evaluation`).
//
// It has nothing to do with `{call_id}_retrieval_evidence.csv` (the
// separate "Retrieval Evidence" sub-tab's source, shown as-is via
// `render_wrapped_table` at app.py:2124-2129). That file holds one row per
// retrieval *candidate* per item (multiple ranks, not just rank 1) and is
// not an input to this function - wiring "Actual Context" to it instead of
// to `agent_evidence`/`evidence` is what produces the wrong long,
// multi-turn, multi-speaker blob instead of a single clean sentence.
// ---------------------------------------------------------------------------

/**
 * `actual_context = agent_evidence`, unless `agent_evidence` is blank
 * (missing, `null`, or empty/whitespace-only string), in which case fall
 * back to `evidence`. Mirrors pandas'
 * `agent_evidence.replace("", pd.NA).fillna(evidence)`, which treats an
 * empty-string cell the same as a missing one; falls back to `evidence`
 * even if `evidence` is itself blank (matching `fillna`'s behavior of
 * inserting whatever the fallback series holds, blank or not).
 */
export function computeActualContext(itemRow: SopItemRow): string {
  const agentEvidence = itemRow.agent_evidence;
  if (typeof agentEvidence === "string" && agentEvidence.trim() !== "") {
    return agentEvidence;
  }
  const evidence = itemRow.evidence;
  return typeof evidence === "string" ? evidence : "";
}
