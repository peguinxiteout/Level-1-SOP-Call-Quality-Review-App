import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import PageContainer from '../layout/PageContainer';

type CsvRow = Record<string, string>;

const QUALITY_SUMMARY_PATH = '/data/batch/batch_quality_summary.csv';

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function meanOrNa(rows: CsvRow[], key: string): number | string {
  if (!rows.length) return 'NA';

  const values = rows
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return 'NA';

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function sumOrNa(rows: CsvRow[], key: string): number | string {
  if (!rows.length) return 'NA';

  const values = rows
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return 'NA';

  return values.reduce((sum, value) => sum + value, 0);
}

function formatPercentValue(value: unknown): string {
  if (value === 'NA' || value === null || value === undefined || value === '') {
    return 'NA';
  }

  return `${Math.round(toNumber(value))}%`;
}

function formatNumberValue(value: unknown): string {
  if (value === 'NA' || value === null || value === undefined || value === '') {
    return 'NA';
  }

  return String(Math.round(toNumber(value)));
}

function formatDurationMinutesSeconds(value: unknown): string {
  if (value === 'NA' || value === null || value === undefined || value === '') {
    return 'NA';
  }

  const seconds = Math.round(toNumber(value));

  if (!seconds) {
    return 'NA';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds} sec`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

function formatTableValue(column: string, value: unknown): string {
  const rawValue = String(value ?? '').trim();

  if (!rawValue) {
    return '';
  }

  const lowerColumn = column.toLowerCase();

  if (
    lowerColumn.includes('pct') ||
    lowerColumn.includes('percent') ||
    lowerColumn.includes('rate')
  ) {
    return rawValue.includes('%') ? rawValue : formatPercentValue(rawValue);
  }

  if (
    lowerColumn.includes('duration') ||
    lowerColumn.includes('time') ||
    lowerColumn.includes('sec') ||
    lowerColumn.includes('wpm') ||
    lowerColumn.includes('count') ||
    lowerColumn.includes('turn') ||
    lowerColumn.includes('snr') ||
    lowerColumn.includes('pitch') ||
    lowerColumn.includes('component') ||
    lowerColumn.includes('score') ||
    lowerColumn.includes('confidence')
  ) {
    const numericValue = Number(rawValue);

    if (Number.isFinite(numericValue)) {
      return String(Math.round(numericValue));
    }
  }

  return rawValue;
}

function normalizeStatus(status?: string): string {
  const value = String(status || '').trim().toLowerCase();

  if (!value || value === 'na') {
    return 'NA';
  }

  if (value.includes('need')) {
    return 'Needs Check';
  }

  if (value.includes('review')) {
    return 'Review';
  }

  if (value.includes('watch')) {
    return 'Watch';
  }

  if (value.includes('good') || value.includes('ok')) {
    return 'Good';
  }

  return status || 'NA';
}

function getStatusClass(status?: string): string {
  const normalizedStatus = normalizeStatus(status).toLowerCase();

  if (normalizedStatus.includes('good')) {
    return 'border-green-500/40 bg-green-500/10 text-green-200';
  }

  if (
    normalizedStatus.includes('watch') ||
    normalizedStatus.includes('review')
  ) {
    return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200';
  }

  if (normalizedStatus.includes('need')) {
    return 'border-red-500/40 bg-red-500/10 text-red-200';
  }

  return 'border-accent-secondary/50 bg-background text-text-muted';
}

function getMajorityStatus(rows: CsvRow[], bandColumn: string): string {
  if (!rows.length) return 'NA';

  const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
    const status = normalizeStatus(row[bandColumn]);

    if (status !== 'NA') {
      counts[status] = (counts[status] || 0) + 1;
    }

    return counts;
  }, {});

  const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

  return sortedStatuses[0]?.[0] || 'NA';
}

function getLongTurnStatus(totalLongTurns: number | string): string {
  if (totalLongTurns === 'NA') return 'NA';

  const count = toNumber(totalLongTurns);

  if (count === 0) return 'Good';
  if (count <= 2) return 'Watch';

  return 'Needs Check';
}

function titleCaseColumn(column: string): string {
  const labelMap: Record<string, string> = {
    call_id: 'Call ID',
    agent: 'Agent',
    call_type: 'Call Type',
    sop_call_type: 'SOP Call Type',
    call_duration_sec: 'Call Duration',
    talk_ratio: 'Talk Ratio',
    silence: 'Silence',
    talkover: 'Talk-over',
    talkover_duration_sec: 'Talk-over Duration',
    customer_talkover: 'Customer Talk-over',
    customer_talkover_duration_sec: 'Customer Talk-over Duration',
    agent_wpm: 'Agent WPM',
    long_agent_turn_count: 'Long Turns',
    audio_metrics_available: 'Audio Metrics Available',
    audio_format: 'Audio Format',
    audio_channels: 'Audio Channels',
    sample_width_bytes: 'Sample Width Bytes',
    snr: 'SNR',
    pitch_variability: 'Pitch Variability',
    customer_experience_concern_call_flag: 'Customer Concern',
  };

  if (labelMap[column]) {
    return labelMap[column];
  }

  return column
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function loadCsv(path: string): Promise<CsvRow[]> {
  const response = await fetch(path);

  if (!response.ok) {
    return [];
  }

  const csvText = await response.text();
  const trimmedText = csvText.trim().toLowerCase();

  if (
    trimmedText.startsWith('<!doctype html') ||
    trimmedText.startsWith('<html') ||
    trimmedText.includes('<script type="module"')
  ) {
    console.warn(`CSV file not found or HTML returned instead: ${path}`);
    return [];
  }

  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cleanRows = result.data.filter((row) =>
          Object.values(row).some((value) => String(value || '').trim() !== ''),
        );

        resolve(cleanRows);
      },
      error: reject,
    });
  });
}

function addCustomerTalkoverFallback(rows: CsvRow[]): CsvRow[] {
  if (!rows.length) return rows;

  const hasCustomerTalkover = Object.prototype.hasOwnProperty.call(
    rows[0],
    'customer_talkover_rate_pct',
  );

  if (hasCustomerTalkover) {
    return rows;
  }

  const hasTotalTalkover = Object.prototype.hasOwnProperty.call(
    rows[0],
    'talkover_rate_pct',
  );

  const hasAgentTalkover = Object.prototype.hasOwnProperty.call(
    rows[0],
    'agent_talkover_rate_pct',
  );

  if (!hasTotalTalkover || !hasAgentTalkover) {
    return rows;
  }

  return rows.map((row) => {
    const totalTalkover = toNumber(row.talkover_rate_pct);
    const agentTalkover = toNumber(row.agent_talkover_rate_pct);
    const customerTalkover = Math.max(totalTalkover - agentTalkover, 0);

    return {
      ...row,
      customer_talkover_rate_pct: String(Math.round(customerTalkover)),
    };
  });
}

function MetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string | number;
  status?: string;
}) {
  return (
    <div className="rounded-2xl border border-accent-secondary/50 bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-text-muted">{label}</p>

        {status ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusClass(
              status,
            )}`}
          >
            {normalizeStatus(status)}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-3xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === 'NA') {
    return null;
  }

  return (
    <span
      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusClass(
        normalizedStatus,
      )}`}
    >
      {normalizedStatus}
    </span>
  );
}

function ValueWithBadge({
  value,
  status,
}: {
  value: string;
  status?: string;
}) {
  return (
    <div>
      <div className="text-text-primary">{value}</div>
      <StatusBadge status={status} />
    </div>
  );
}

function DataTable({
  rows,
  maxHeight = 360,
}: {
  rows: CsvRow[];
  maxHeight?: number;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/60 bg-surface p-4 text-sm text-text-muted">
        No data available.
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div
      className="overflow-auto rounded-xl border border-white/70"
      style={{ maxHeight }}
    >
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-surface text-text-primary">
          <tr className="border-b-2 border-white/80">
            {columns.map((column) => (
              <th
                key={column}
                className="border border-white/60 px-3 py-3 align-top font-semibold"
              >
                {titleCaseColumn(column)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-black">
              {columns.map((column) => (
                <td
                  key={column}
                  className="whitespace-pre-line border border-white/45 px-3 py-3 align-top text-text-primary"
                >
                  {formatTableValue(column, row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentSummaryTable({
  rows,
  maxHeight = 420,
}: {
  rows: CsvRow[];
  maxHeight?: number;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/60 bg-surface p-4 text-sm text-text-muted">
        No data available.
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-xl border border-white/70"
      style={{ maxHeight }}
    >
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-surface text-text-primary">
          <tr className="border-b-2 border-white/80">
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Call ID
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Agent
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Call Type
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              SOP Call Type
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Call Duration
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Talk Ratio
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Silence
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Talk-over
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Talk-over Duration
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Customer Talk-over
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Customer Talk-over Duration
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Agent WPM
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Long Turns
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Audio Metrics Available
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Audio Format
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Audio Channels
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Sample Width Bytes
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              SNR
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Pitch Variability
            </th>
            <th className="border border-white/60 px-3 py-3 align-top font-semibold">
              Customer Concern
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.call_id}-${rowIndex}`} className="bg-black">
              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {row.call_id || ''}
              </td>

              <td className="whitespace-pre-line border border-white/45 px-3 py-3 align-top text-text-primary">
                {[row.agent_name, row.agent_id].filter(Boolean).join('\n')}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {row.call_type || ''}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {row.sop_call_type || ''}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {formatDurationMinutesSeconds(row.call_duration_sec)}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top">
                <ValueWithBadge
                  value={formatPercentValue(row.agent_talk_ratio_pct)}
                  status={row.agent_talk_ratio_band}
                />
              </td>

              <td className="border border-white/45 px-3 py-3 align-top">
                <ValueWithBadge
                  value={formatPercentValue(row.silence_ratio_pct)}
                  status={row.silence_ratio_band}
                />
              </td>

              <td className="border border-white/45 px-3 py-3 align-top">
                <ValueWithBadge
                  value={formatPercentValue(row.agent_talkover_rate_pct)}
                  status={row.agent_talkover_rate_band}
                />
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {formatNumberValue(row.agent_talkover_duration_sec)}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top">
                <ValueWithBadge
                  value={formatPercentValue(row.customer_talkover_rate_pct)}
                  status={row.customer_talkover_rate_band}
                />
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {formatNumberValue(row.customer_talkover_duration_sec)}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top">
                <ValueWithBadge
                  value={formatNumberValue(row.agent_wpm)}
                  status={row.agent_wpm_band}
                />
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {formatNumberValue(row.long_agent_turn_count)}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {row.audio_metrics_available || ''}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {row.audio_format || ''}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {formatNumberValue(row.audio_channels)}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {formatNumberValue(row.sample_width_bytes)}
              </td>

              <td className="border border-white/45 px-3 py-3 align-top">
                <ValueWithBadge
                  value={formatNumberValue(row.snr_db_approx)}
                  status={row.snr_band}
                />
              </td>

              <td className="border border-white/45 px-3 py-3 align-top">
                <ValueWithBadge
                  value={formatNumberValue(row.pitch_std_hz_approx)}
                  status={row.pitch_variability_band}
                />
              </td>

              <td className="border border-white/45 px-3 py-3 align-top text-text-primary">
                {row.customer_experience_concern_call_flag || 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getTranscriptSpeakerLabel(row: CsvRow): string {
  const role = String(row.role || '').trim();
  const speaker = String(row.speaker || '').trim();

  if (role && role.toLowerCase() !== 'unknown' && role.toLowerCase() !== 'na') {
    return role;
  }

  return speaker || 'Speaker';
}

function formatTranscriptTimestamp(row: CsvRow): string {
  const start =
    row.start_time_sec ||
    row.start_time ||
    row.start ||
    row.start_sec ||
    '';

  const end =
    row.end_time_sec ||
    row.end_time ||
    row.end ||
    row.end_sec ||
    '';

  const startNumber = Number(start);
  const endNumber = Number(end);

  if (!Number.isFinite(startNumber)) {
    return '';
  }

  if (!Number.isFinite(endNumber)) {
    return `${startNumber.toFixed(1)}s`;
  }

  return `${startNumber.toFixed(1)}–${endNumber.toFixed(1)}s`;
}

function isAgentTranscriptTurn(row: CsvRow): boolean {
  const role = String(row.role || '').trim().toLowerCase();

  return role === 'agent';
}

function getTranscriptText(row: CsvRow): string {
  return (
    row.utterance ||
    row.text ||
    row.transcript ||
    row.content ||
    row.message ||
    row.sentence ||
    ''
  );
}

function TranscriptView({ rows }: { rows: CsvRow[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/60 bg-black p-4 text-sm text-text-muted">
        Transcript turns not available.
      </div>
    );
  }

  return (
    <div className="flex max-h-[32rem] flex-col gap-4 overflow-y-auto rounded-xl border border-white/70 bg-black px-6 py-5">
      {rows.map((row, index) => {
        const isAgent = isAgentTranscriptTurn(row);
        const speakerLabel = getTranscriptSpeakerLabel(row);
        const timestamp = formatTranscriptTimestamp(row);
        const utterance = getTranscriptText(row);
        const turnId = row.turn_id || String(index + 1);

        return (
          <div
            key={`${turnId}-${index}`}
            className={`flex w-full ${isAgent ? 'justify-start pr-[22%]' : 'justify-end pl-[22%]'}`}
          >
            <div
              className={`max-w-[620px] rounded-lg border px-3 py-2 shadow-sm ${
                isAgent
                  ? 'border-violet-500/70 bg-[#241f63]'
                  : 'border-blue-500/70 bg-[#17326d]'
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span className="font-semibold text-text-primary">
                  {speakerLabel}
                </span>

                {timestamp ? <span>{timestamp}</span> : null}
              </div>

              <p className="whitespace-normal break-words text-sm leading-relaxed text-text-primary">
                {utterance}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailTabs({
  selectedCallId,
  qualityTurnRows,
  sentimentTurnRows,
  negativeTurnRows,
  transcriptRows,
}: {
  selectedCallId: string;
  qualityTurnRows: CsvRow[];
  sentimentTurnRows: CsvRow[];
  negativeTurnRows: CsvRow[];
  transcriptRows: CsvRow[];
}) {
  const [activeTab, setActiveTab] = useState('Turn-Level Flow');

  const tabs = ['Turn-Level Flow', 'Sentiment Evidence', 'Transcript'];

  return (
    <div className="space-y-5">
      <hr className="border-accent-secondary/30" />

      <h1 className="text-4xl font-semibold text-text-primary">
        Agent Performance Detail: {selectedCallId}
      </h1>

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'bg-accent text-white'
                : 'bg-surface text-text-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Turn-Level Flow' ? (
        qualityTurnRows.length ? (
          <DataTable rows={qualityTurnRows} maxHeight={400} />
        ) : (
          <div className="rounded-xl border border-white/60 bg-surface p-4 text-sm text-text-muted">
            Turn-level agent performance details not available.
          </div>
        )
      ) : null}

      {activeTab === 'Sentiment Evidence' ? (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-text-primary">
            Customer Experience Concern Evidence
          </h2>

          {negativeTurnRows.length ? (
            <DataTable rows={negativeTurnRows} maxHeight={250} />
          ) : (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
              No customer experience concerns detected.
            </div>
          )}

          <h2 className="text-xl font-semibold text-text-primary">
            All Turn-Level Sentiment Audit
          </h2>

          {sentimentTurnRows.length ? (
            <DataTable rows={sentimentTurnRows} maxHeight={350} />
          ) : null}
        </div>
      ) : null}

      {activeTab === 'Transcript' ? (
        <TranscriptView rows={transcriptRows} />
      ) : null}
    </div>
  );
}

export default function AgentPerformanceMetrics() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [selectedCallId, setSelectedCallId] = useState('');
  const [rowLimit, setRowLimit] = useState('10');

  const [qualityTurnRows, setQualityTurnRows] = useState<CsvRow[]>([]);
  const [sentimentTurnRows, setSentimentTurnRows] = useState<CsvRow[]>([]);
  const [negativeTurnRows, setNegativeTurnRows] = useState<CsvRow[]>([]);
  const [transcriptRows, setTranscriptRows] = useState<CsvRow[]>([]);

  useEffect(() => {
    loadCsv(QUALITY_SUMMARY_PATH).then((data) => {
      setRows(addCustomerTalkoverFallback(data));
    });
  }, []);

  useEffect(() => {
    if (!selectedCallId) {
      setQualityTurnRows([]);
      setSentimentTurnRows([]);
      setNegativeTurnRows([]);
      setTranscriptRows([]);
      return;
    }

    loadCsv(`/data/turn_level/${selectedCallId}_quality_turns.csv`).then(
      setQualityTurnRows,
    );

    loadCsv(`/data/turn_level/${selectedCallId}_sentiment_turns.csv`).then(
      setSentimentTurnRows,
    );

    loadCsv(`/data/turn_level/${selectedCallId}_negative_sentiment_turns.csv`).then(
      setNegativeTurnRows,
    );

    loadCsv(`/data/turn_level/${selectedCallId}_turns.csv`).then(setTranscriptRows);
  }, [selectedCallId]);

  const callIds = useMemo(() => {
    return rows
      .map((row) => row.call_id)
      .filter(Boolean)
      .sort();
  }, [rows]);

  const totalLongTurns = sumOrNa(rows, 'long_agent_turn_count');

  const displayRows = useMemo(() => {
    if (rowLimit === 'All') {
      return rows;
    }

    return rows.slice(0, Number(rowLimit));
  }, [rows, rowLimit]);

  return (
    <PageContainer title="Agent Performance Metrics">
      <div className="space-y-8">
        {!rows.length ? (
          <div className="rounded-xl border border-white/60 bg-surface p-4 text-sm text-text-muted">
            Run batch processing to generate agent performance summary.
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Calls Processed" value={rows.length} />

              <MetricCard
                label="Avg Call Duration"
                value={formatDurationMinutesSeconds(
                  meanOrNa(rows, 'call_duration_sec'),
                )}
              />

              <MetricCard
                label="Avg Talktime"
                value={formatPercentValue(meanOrNa(rows, 'agent_talk_ratio_pct'))}
                status={getMajorityStatus(rows, 'agent_talk_ratio_band')}
              />

              <MetricCard
                label="Avg Silence"
                value={formatPercentValue(meanOrNa(rows, 'silence_ratio_pct'))}
                status={getMajorityStatus(rows, 'silence_ratio_band')}
              />

              <MetricCard
                label="Avg Talk-over Rate"
                value={formatPercentValue(
                  meanOrNa(rows, 'agent_talkover_rate_pct'),
                )}
                status={getMajorityStatus(rows, 'agent_talkover_rate_band')}
              />

              <MetricCard
                label="Avg WPM"
                value={formatNumberValue(meanOrNa(rows, 'agent_wpm'))}
                status={getMajorityStatus(rows, 'agent_wpm_band')}
              />

              <MetricCard
                label="Total Long Turns"
                value={formatNumberValue(totalLongTurns)}
                status={getLongTurnStatus(totalLongTurns)}
              />

              <MetricCard
                label="Avg Customer Talk-over Rate"
                value={formatPercentValue(
                  meanOrNa(rows, 'customer_talkover_rate_pct'),
                )}
                status={getMajorityStatus(rows, 'customer_talkover_rate_band')}
              />
            </section>

            <section className="space-y-4">
              <h2 className="text-3xl font-semibold text-text-primary">
                Call-Level Agent Performance Summary
              </h2>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Rows to show
                </label>

                <select
                  value={rowLimit}
                  onChange={(event) => setRowLimit(event.target.value)}
                  className="w-full rounded-lg border border-accent-secondary/50 bg-surface px-4 py-3 text-text-primary outline-none"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="All">All</option>
                </select>
              </div>

              {rowLimit !== 'All' && rows.length > Number(rowLimit) ? (
                <p className="text-sm text-text-muted">
                  Showing {displayRows.length} of {rows.length} calls.
                </p>
              ) : null}

              <AgentSummaryTable rows={displayRows} maxHeight={420} />
            </section>

            <section className="space-y-4">
              <h2 className="text-3xl font-semibold text-text-primary">
                Detailed Check
              </h2>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Select call for Agent Performance
                </label>

                <select
                  value={selectedCallId}
                  onChange={(event) => setSelectedCallId(event.target.value)}
                  className="w-full rounded-lg border border-accent-secondary/50 bg-surface px-4 py-3 text-text-primary outline-none"
                >
                  <option value="">Choose an option</option>
                  {callIds.map((callId) => (
                    <option key={callId} value={callId}>
                      {callId}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCallId ? (
                <DetailTabs
                  selectedCallId={selectedCallId}
                  qualityTurnRows={qualityTurnRows}
                  sentimentTurnRows={sentimentTurnRows}
                  negativeTurnRows={negativeTurnRows}
                  transcriptRows={transcriptRows}
                />
              ) : null}
            </section>
          </>
        )}
      </div>
    </PageContainer>
  );
}