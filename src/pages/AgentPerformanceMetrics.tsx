import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import PageContainer from '../layout/PageContainer';
import DataTable, { type DataTableColumn } from '../components/executive-story/DataTable';
import StatusPill from '../components/executive-story/StatusPill';
import TableCard from '../components/executive-story/TableCard';
import TabGroup from '../components/executive-story/TabGroup';
import TileGrid, { type Tile } from '../components/executive-story/TileGrid';
import { toneForBand, type StatusTone } from '../lib/ui/status';
import RowsToShowSelect, { sliceRows, type RowsToShow } from '../components/sop-adherence/RowsToShowSelect';

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
  if (normalized === 'NA') return undefined;
  return { tone: toneForBand(normalized), label: normalized };
}

function bandedCell(value: string, band?: string) {
  const bandLabel = String(band ?? '').trim();
  const showPill = bandLabel && bandLabel.toUpperCase() !== 'NA';

  return (
    <div className="flex items-center gap-2">
      <span>{value}</span>
      {showPill && <StatusPill tone={toneForBand(bandLabel)} label={bandLabel} />}
    </div>
  );
}

/** Renders whatever columns are present on the first row - used for turn-level CSV panels with no curated shape. */
function buildGenericColumns(rows: CsvRow[]): DataTableColumn<CsvRow>[] {
  if (!rows.length) return [];

  return Object.keys(rows[0]).map((column) => ({
    key: column,
    header: titleCaseColumn(column),
    accessor: (row) => row[column],
    render: (row) => formatTableValue(column, row[column]),
  }));
}

const AGENT_SUMMARY_COLUMNS: DataTableColumn<CsvRow>[] = [
  { key: 'call_id', header: 'Call ID', accessor: (row) => row.call_id, render: (row) => row.call_id || '' },
  {
    key: 'agent',
    header: 'Agent',
    accessor: (row) => row.agent_name || row.agent_id || '',
    render: (row) => (
      <div className="whitespace-pre-line">{[row.agent_name, row.agent_id].filter(Boolean).join('\n')}</div>
    ),
  },
  { key: 'call_type', header: 'Call Type', accessor: (row) => row.call_type, render: (row) => row.call_type || '' },
  { key: 'sop_call_type', header: 'SOP Call Type', accessor: (row) => row.sop_call_type, render: (row) => row.sop_call_type || '' },
  {
    key: 'call_duration_sec',
    header: 'Call Duration',
    accessor: (row) => toNumber(row.call_duration_sec),
    render: (row) => formatDurationMinutesSeconds(row.call_duration_sec),
  },
  {
    key: 'talk_ratio',
    header: 'Talk Ratio',
    accessor: (row) => toNumber(row.agent_talk_ratio_pct),
    render: (row) => bandedCell(formatPercentValue(row.agent_talk_ratio_pct), row.agent_talk_ratio_band),
  },
  {
    key: 'silence',
    header: 'Silence',
    accessor: (row) => toNumber(row.silence_ratio_pct),
    render: (row) => bandedCell(formatPercentValue(row.silence_ratio_pct), row.silence_ratio_band),
  },
  {
    key: 'talkover',
    header: 'Talk-over',
    accessor: (row) => toNumber(row.agent_talkover_rate_pct),
    render: (row) => bandedCell(formatPercentValue(row.agent_talkover_rate_pct), row.agent_talkover_rate_band),
  },
  {
    key: 'talkover_duration',
    header: 'Talk-over Duration',
    accessor: (row) => toNumber(row.agent_talkover_duration_sec),
    render: (row) => formatNumberValue(row.agent_talkover_duration_sec),
  },
  {
    key: 'customer_talkover',
    header: 'Customer Talk-over',
    accessor: (row) => toNumber(row.customer_talkover_rate_pct),
    render: (row) => bandedCell(formatPercentValue(row.customer_talkover_rate_pct), row.customer_talkover_rate_band),
  },
  {
    key: 'customer_talkover_duration',
    header: 'Customer Talk-over Duration',
    accessor: (row) => toNumber(row.customer_talkover_duration_sec),
    render: (row) => formatNumberValue(row.customer_talkover_duration_sec),
  },
  {
    key: 'agent_wpm',
    header: 'Agent WPM',
    accessor: (row) => toNumber(row.agent_wpm),
    render: (row) => bandedCell(formatNumberValue(row.agent_wpm), row.agent_wpm_band),
  },
  {
    key: 'long_turns',
    header: 'Long Turns',
    accessor: (row) => toNumber(row.long_agent_turn_count),
    render: (row) => formatNumberValue(row.long_agent_turn_count),
  },
  {
    key: 'audio_metrics_available',
    header: 'Audio Metrics Available',
    accessor: (row) => row.audio_metrics_available,
    render: (row) => row.audio_metrics_available || '',
  },
  { key: 'audio_format', header: 'Audio Format', accessor: (row) => row.audio_format, render: (row) => row.audio_format || '' },
  {
    key: 'audio_channels',
    header: 'Audio Channels',
    accessor: (row) => toNumber(row.audio_channels),
    render: (row) => formatNumberValue(row.audio_channels),
  },
  {
    key: 'sample_width_bytes',
    header: 'Sample Width Bytes',
    accessor: (row) => toNumber(row.sample_width_bytes),
    render: (row) => formatNumberValue(row.sample_width_bytes),
  },
  {
    key: 'snr',
    header: 'SNR',
    accessor: (row) => toNumber(row.snr_db_approx),
    render: (row) => bandedCell(formatNumberValue(row.snr_db_approx), row.snr_band),
  },
  {
    key: 'pitch_variability',
    header: 'Pitch Variability',
    accessor: (row) => toNumber(row.pitch_std_hz_approx),
    render: (row) => bandedCell(formatNumberValue(row.pitch_std_hz_approx), row.pitch_variability_band),
  },
  {
    key: 'customer_concern',
    header: 'Customer Concern',
    accessor: (row) => row.customer_experience_concern_call_flag || 'No',
    render: (row) => row.customer_experience_concern_call_flag || 'No',
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
  return (
    <div className="space-y-5">
      <hr className="border-accent-secondary/30" />

      <h1 className="text-4xl font-semibold text-text-primary">
        Agent Performance Detail: {selectedCallId}
      </h1>

      <TabGroup
        title="Agent Performance"
        tabs={[
          {
            key: 'turn-level-flow',
            label: 'Turn-Level Flow',
            available: qualityTurnRows.length > 0,
            content: qualityTurnRows.length ? (
              <div className="w-full max-h-[420px] overflow-auto [&>div]:overflow-visible">
                <DataTable columns={buildGenericColumns(qualityTurnRows)} rows={qualityTurnRows} rowKey={(_row, index) => String(index)} />
              </div>
            ) : (
              <p className="p-4 text-sm text-text-muted">Turn-level agent performance details not available.</p>
            ),
          },
          {
            key: 'sentiment-evidence',
            label: 'Sentiment Evidence',
            available: sentimentTurnRows.length > 0 || negativeTurnRows.length > 0,
            content: (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-text-primary">Customer Experience Concern Evidence</h2>

                {negativeTurnRows.length ? (
                  <div className="w-full max-h-[300px] overflow-auto [&>div]:overflow-visible">
                    <DataTable
                      columns={buildGenericColumns(negativeTurnRows)}
                      rows={negativeTurnRows}
                      rowKey={(_row, index) => String(index)}
                    />
                  </div>
                ) : (
                  <p className="rounded-lg border border-status-good/30 bg-status-good/10 p-3 text-sm text-status-good">
                    No customer experience concerns detected.
                  </p>
                )}

                <h2 className="text-xl font-semibold text-text-primary">All Turn-Level Sentiment Audit</h2>

                {sentimentTurnRows.length ? (
                  <div className="w-full max-h-[420px] overflow-auto [&>div]:overflow-visible">
                    <DataTable
                      columns={buildGenericColumns(sentimentTurnRows)}
                      rows={sentimentTurnRows}
                      rowKey={(_row, index) => String(index)}
                    />
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: 'transcript',
            label: 'Transcript',
            available: transcriptRows.length > 0,
            content: <TranscriptView rows={transcriptRows} />,
          },
        ]}
      />
    </div>
  );
}

export default function AgentPerformanceMetrics() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [selectedCallId, setSelectedCallId] = useState('');
  const [rowsToShow, setRowsToShow] = useState<RowsToShow>(10);

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
    <PageContainer title="Agent Performance Metrics">
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

              <TableCard>
                <DataTable
                  columns={AGENT_SUMMARY_COLUMNS}
                  rows={displayRows}
                  rowKey={(row, index) => `${row.call_id}-${index}`}
                  emptyMessage="No data available."
                />
              </TableCard>
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