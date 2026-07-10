import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import PageContainer from '../layout/PageContainer';
import StatusPill from '../components/executive-story/StatusPill';
import TileGrid, { type Tile } from '../components/executive-story/TileGrid';
import { toneForBand, type StatusTone } from '../lib/ui/status';

type CsvRow = Record<string, string>;

type RowsToShow = '5' | '10' | '25' | '50' | 'all';

type TableColumn<T> = {
  key: string;
  header: string;
  accessor?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  minWidth?: string;
};

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

function statusBadge(status?: string): { tone: StatusTone; label: string } | undefined {
  const normalized = normalizeStatus(status);

  if (normalized === 'NA') {
    return undefined;
  }

  return {
    tone: toneForBand(normalized),
    label: normalized,
  };
}

function bandedCell(value: string, band?: string) {
  const bandLabel = String(band ?? '').trim();
  const showPill = bandLabel && bandLabel.toUpperCase() !== 'NA';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{value}</span>
      {showPill ? <StatusPill tone={toneForBand(bandLabel)} label={bandLabel} /> : null}
    </div>
  );
}

function RowsToShowSelect({
  value,
  onChange,
}: {
  value: RowsToShow;
  onChange: (value: RowsToShow) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm font-medium text-text-muted">Rows to show</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RowsToShow)}
        className="rounded-lg border border-accent-secondary/50 bg-black px-4 py-2 text-text-primary outline-none"
      >
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="all">All</option>
      </select>
    </div>
  );
}

function sliceRows(rows: CsvRow[], rowsToShow: RowsToShow): CsvRow[] {
  if (rowsToShow === 'all') {
    return rows;
  }

  return rows.slice(0, Number(rowsToShow));
}

function buildGenericColumns(rows: CsvRow[]): TableColumn<CsvRow>[] {
  if (!rows.length) return [];

  return Object.keys(rows[0]).map((column) => ({
    key: column,
    header: titleCaseColumn(column),
    render: (row) => formatTableValue(column, row[column]),
    minWidth: column.length > 20 ? '180px' : '130px',
  }));
}

function ScrollDataTable({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No data available.',
  maxHeight = 360,
}: {
  columns: TableColumn<CsvRow>[];
  rows: CsvRow[];
  rowKey: (row: CsvRow, index: number) => string;
  emptyMessage?: string;
  maxHeight?: number;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/60 bg-surface p-4 text-sm text-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="agent-scrollbar overflow-auto rounded-xl border border-white/70"
      style={{ maxHeight }}
    >
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-surface text-text-primary">
          <tr className="border-b-2 border-white/80">
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-normal break-words border border-white/60 px-3 py-3 align-top font-semibold leading-snug"
                style={{ minWidth: column.minWidth ?? '130px' }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowKey(row, rowIndex)} className="bg-black">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="whitespace-pre-line break-words border border-white/45 px-3 py-3 align-top text-text-primary"
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const AGENT_SUMMARY_COLUMNS: TableColumn<CsvRow>[] = [
  {
    key: 'call_id',
    header: 'Call ID',
    render: (row) => row.call_id || '',
    minWidth: '110px',
  },
  {
    key: 'agent',
    header: 'Agent',
    render: (row) => (
      <div className="whitespace-pre-line">
        {[row.agent_name, row.agent_id].filter(Boolean).join('\n')}
      </div>
    ),
    minWidth: '130px',
  },
  {
    key: 'call_type',
    header: 'Call Type',
    render: (row) => row.call_type || '',
    minWidth: '130px',
  },
  {
    key: 'sop_call_type',
    header: 'SOP Call Type',
    render: (row) => row.sop_call_type || '',
    minWidth: '130px',
  },
  {
    key: 'call_duration_sec',
    header: 'Call Duration',
    render: (row) => formatDurationMinutesSeconds(row.call_duration_sec),
    minWidth: '130px',
  },
  {
    key: 'talk_ratio',
    header: 'Talk Ratio',
    render: (row) =>
      bandedCell(formatPercentValue(row.agent_talk_ratio_pct), row.agent_talk_ratio_band),
    minWidth: '140px',
  },
  {
    key: 'silence',
    header: 'Silence',
    render: (row) =>
      bandedCell(formatPercentValue(row.silence_ratio_pct), row.silence_ratio_band),
    minWidth: '130px',
  },
  {
    key: 'talkover',
    header: 'Talk-over',
    render: (row) =>
      bandedCell(formatPercentValue(row.agent_talkover_rate_pct), row.agent_talkover_rate_band),
    minWidth: '140px',
  },
  {
    key: 'talkover_duration',
    header: 'Talk-over Duration',
    render: (row) => formatNumberValue(row.agent_talkover_duration_sec),
    minWidth: '155px',
  },
  {
    key: 'customer_talkover',
    header: 'Customer Talk-over',
    render: (row) =>
      bandedCell(formatPercentValue(row.customer_talkover_rate_pct), row.customer_talkover_rate_band),
    minWidth: '160px',
  },
  {
    key: 'customer_talkover_duration',
    header: 'Customer Talk-over Duration',
    render: (row) => formatNumberValue(row.customer_talkover_duration_sec),
    minWidth: '175px',
  },
  {
    key: 'agent_wpm',
    header: 'Agent WPM',
    render: (row) => bandedCell(formatNumberValue(row.agent_wpm), row.agent_wpm_band),
    minWidth: '135px',
  },
  {
    key: 'long_turns',
    header: 'Long Turns',
    render: (row) => formatNumberValue(row.long_agent_turn_count),
    minWidth: '110px',
  },
  {
    key: 'audio_metrics_available',
    header: 'Audio Metrics Available',
    render: (row) => row.audio_metrics_available || '',
    minWidth: '170px',
  },
  {
    key: 'audio_format',
    header: 'Audio Format',
    render: (row) => row.audio_format || '',
    minWidth: '140px',
  },
  {
    key: 'audio_channels',
    header: 'Audio Channels',
    render: (row) => formatNumberValue(row.audio_channels),
    minWidth: '140px',
  },
  {
    key: 'sample_width_bytes',
    header: 'Sample Width Bytes',
    render: (row) => formatNumberValue(row.sample_width_bytes),
    minWidth: '160px',
  },
  {
    key: 'snr',
    header: 'SNR',
    render: (row) => bandedCell(formatNumberValue(row.snr_db_approx), row.snr_band),
    minWidth: '120px',
  },
  {
    key: 'pitch_variability',
    header: 'Pitch Variability',
    render: (row) =>
      bandedCell(formatNumberValue(row.pitch_std_hz_approx), row.pitch_variability_band),
    minWidth: '155px',
  },
  {
    key: 'customer_concern',
    header: 'Customer Concern',
    render: (row) => row.customer_experience_concern_call_flag || 'No',
    minWidth: '160px',
  },
];

function getTranscriptSpeakerLabel(row: CsvRow): string {
  const role = String(row.role || '').trim();
  const speaker = String(row.speaker || '').trim();

  if (role && role.toLowerCase() !== 'unknown' && role.toLowerCase() !== 'na') {
    return role;
  }

  return speaker || 'Speaker';
}

function getTranscriptSpeakerCode(row: CsvRow): string {
  return String(row.speaker || '').trim();
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
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Showing all {rows.length} transcript turns for this call.
      </p>

      <div className="agent-scrollbar flex max-h-[32rem] flex-col gap-4 overflow-auto rounded-xl border border-white/70 bg-black px-6 py-5">
        {rows.map((row, index) => {
          const isAgent = isAgentTranscriptTurn(row);
          const speakerLabel = getTranscriptSpeakerLabel(row);
          const speakerCode = getTranscriptSpeakerCode(row);
          const timestamp = formatTranscriptTimestamp(row);
          const utterance = getTranscriptText(row);
          const turnId = row.turn_id || String(index + 1);

          const showSpeakerCode =
            speakerCode &&
            speakerCode.toLowerCase() !== speakerLabel.toLowerCase();

          return (
            <div
              key={`${turnId}-${index}`}
              className={`flex w-full ${
                isAgent ? 'justify-start pr-[28%]' : 'justify-end pl-[28%]'
              }`}
            >
              <div
                className={`max-w-[560px] rounded-lg border px-3 py-2 shadow-sm ${
                  isAgent
                    ? 'border-violet-500/70 bg-[#241f63]'
                    : 'border-blue-500/70 bg-[#17326d]'
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="font-semibold text-text-primary">
                    {speakerLabel}
                  </span>

                  {showSpeakerCode ? <span>{speakerCode}</span> : null}

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
  const [activeTab, setActiveTab] = useState('turn-level-flow');

  const tabs = [
    { key: 'turn-level-flow', label: 'Turn-Level Flow' },
    { key: 'sentiment-evidence', label: 'Sentiment Evidence' },
    { key: 'transcript', label: 'Transcript' },
  ];

  return (
    <div className="space-y-5">
      <hr className="border-accent-secondary/30" />

      <h1 className="text-4xl font-semibold text-text-primary">
        Agent Performance Detail: {selectedCallId}
      </h1>

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'bg-accent text-white'
                : 'bg-surface text-text-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'turn-level-flow' ? (
        qualityTurnRows.length ? (
          <ScrollDataTable
            columns={buildGenericColumns(qualityTurnRows)}
            rows={qualityTurnRows}
            rowKey={(_row, index) => String(index)}
            maxHeight={360}
          />
        ) : (
          <p className="rounded-xl border border-white/60 bg-surface p-4 text-sm text-text-muted">
            Turn-level agent performance details not available.
          </p>
        )
      ) : null}

      {activeTab === 'sentiment-evidence' ? (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-text-primary">
            Customer Experience Concern Evidence
          </h2>

          {negativeTurnRows.length ? (
            <ScrollDataTable
              columns={buildGenericColumns(negativeTurnRows)}
              rows={negativeTurnRows}
              rowKey={(_row, index) => String(index)}
              maxHeight={300}
            />
          ) : (
            <p className="rounded-lg border border-status-good/30 bg-status-good/10 p-3 text-sm text-status-good">
              No customer experience concerns detected.
            </p>
          )}

          <h2 className="text-xl font-semibold text-text-primary">
            All Turn-Level Sentiment Audit
          </h2>

          {sentimentTurnRows.length ? (
            <ScrollDataTable
              columns={buildGenericColumns(sentimentTurnRows)}
              rows={sentimentTurnRows}
              rowKey={(_row, index) => String(index)}
              maxHeight={360}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === 'transcript' ? <TranscriptView rows={transcriptRows} /> : null}
    </div>
  );
}

export default function AgentPerformanceMetrics() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [selectedCallId, setSelectedCallId] = useState('');
  const [rowsToShow, setRowsToShow] = useState<RowsToShow>('10');

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

  const displayRows = useMemo(() => sliceRows(rows, rowsToShow), [rows, rowsToShow]);

  const kpiTiles: Tile[] = [
    { kind: 'stat', label: 'Calls Processed', value: String(rows.length) },
    {
      kind: 'stat',
      label: 'Avg Call Duration',
      value: formatDurationMinutesSeconds(meanOrNa(rows, 'call_duration_sec')),
    },
    {
      kind: 'stat',
      label: 'Avg Talktime',
      value: formatPercentValue(meanOrNa(rows, 'agent_talk_ratio_pct')),
      status: statusBadge(getMajorityStatus(rows, 'agent_talk_ratio_band')),
    },
    {
      kind: 'stat',
      label: 'Avg Silence',
      value: formatPercentValue(meanOrNa(rows, 'silence_ratio_pct')),
      status: statusBadge(getMajorityStatus(rows, 'silence_ratio_band')),
    },
    {
      kind: 'stat',
      label: 'Avg Talk-over Rate',
      value: formatPercentValue(meanOrNa(rows, 'agent_talkover_rate_pct')),
      status: statusBadge(getMajorityStatus(rows, 'agent_talkover_rate_band')),
    },
    {
      kind: 'stat',
      label: 'Avg WPM',
      value: formatNumberValue(meanOrNa(rows, 'agent_wpm')),
      status: statusBadge(getMajorityStatus(rows, 'agent_wpm_band')),
    },
    {
      kind: 'stat',
      label: 'Total Long Turns',
      value: formatNumberValue(totalLongTurns),
      status: statusBadge(getLongTurnStatus(totalLongTurns)),
    },
    {
      kind: 'stat',
      label: 'Avg Customer Talk-over Rate',
      value: formatPercentValue(meanOrNa(rows, 'customer_talkover_rate_pct')),
      status: statusBadge(getMajorityStatus(rows, 'customer_talkover_rate_band')),
    },
  ];

  return (
    <PageContainer title="Agent Performance">
      <style>
        {`
          .agent-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .agent-scrollbar::-webkit-scrollbar {
            width: 0;
            height: 0;
          }

          .agent-scrollbar:hover {
            scrollbar-width: thin;
          }

          .agent-scrollbar:hover::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }

          .agent-scrollbar:hover::-webkit-scrollbar-track {
            background: #f2f2f2;
          }

          .agent-scrollbar:hover::-webkit-scrollbar-thumb {
            background: #8f8f8f;
            border-radius: 999px;
          }

          .agent-scrollbar:hover::-webkit-scrollbar-thumb:hover {
            background: #6f6f6f;
          }
        `}
      </style>

      <div className="space-y-8">
        {!rows.length ? (
          <div className="rounded-xl border border-white/60 bg-surface p-4 text-sm text-text-muted">
            Run batch processing to generate agent performance summary.
          </div>
        ) : (
          <>
            <TileGrid tiles={kpiTiles} />

            <section className="space-y-4">
              <h2 className="text-3xl font-semibold text-text-primary">
                Call-Level Agent Performance Summary
              </h2>

              <RowsToShowSelect value={rowsToShow} onChange={setRowsToShow} />

              {rowsToShow !== 'all' && rows.length > displayRows.length ? (
                <p className="text-sm text-text-muted">
                  Showing {displayRows.length} of {rows.length} calls.
                </p>
              ) : null}

              <ScrollDataTable
                columns={AGENT_SUMMARY_COLUMNS}
                rows={displayRows}
                rowKey={(row, index) => `${row.call_id}-${index}`}
                emptyMessage="No data available."
                maxHeight={360}
              />
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