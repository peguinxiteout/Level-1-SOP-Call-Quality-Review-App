import { useEffect, useMemo, useState, type ReactNode } from "react";
import Papa from "papaparse";
import PageContainer from "../layout/PageContainer";
import StatusPill from "../components/executive-story/StatusPill";
import TabGroup from "../components/executive-story/TabGroup";
import TileGrid, { type Tile } from "../components/executive-story/TileGrid";
import TranscriptView from "../components/executive-story/TranscriptView";
import { toneForBand, type StatusTone } from "../lib/ui/status";
import RowsToShowSelect, {
  sliceRows,
  type RowsToShow,
} from "../components/sop-adherence/RowsToShowSelect";

type CsvRow = Record<string, string>;

type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  minWidth?: string;
};

const QUALITY_SUMMARY_PATH = "/data/batch/batch_quality_summary.csv";

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function meanOrNa(rows: CsvRow[], key: string): number | string {
  if (!rows.length) return "NA";

  const values = rows
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return "NA";

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function sumOrNa(rows: CsvRow[], key: string): number | string {
  if (!rows.length) return "NA";

  const values = rows
    .map((row) => Number(row[key]))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return "NA";

  return values.reduce((sum, value) => sum + value, 0);
}

function formatPercentValue(value: unknown): string {
  if (value === "NA" || value === null || value === undefined || value === "") {
    return "NA";
  }

  return `${Math.round(toNumber(value))}%`;
}

function formatNumberValue(value: unknown): string {
  if (value === "NA" || value === null || value === undefined || value === "") {
    return "NA";
  }

  return String(Math.round(toNumber(value)));
}

function formatDurationMinutesSeconds(value: unknown): string {
  if (value === "NA" || value === null || value === undefined || value === "") {
    return "NA";
  }

  const seconds = Math.round(toNumber(value));

  if (!seconds) {
    return "NA";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds} sec`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

function formatTableValue(column: string, value: unknown): string {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "NA";
  }

  const lowerColumn = column.toLowerCase();

  if (
    lowerColumn.includes("pct") ||
    lowerColumn.includes("percent") ||
    lowerColumn.includes("rate")
  ) {
    return rawValue.includes("%") ? rawValue : formatPercentValue(rawValue);
  }

  if (
    lowerColumn.includes("duration") ||
    lowerColumn.includes("time") ||
    lowerColumn.includes("sec") ||
    lowerColumn.includes("wpm") ||
    lowerColumn.includes("count") ||
    lowerColumn.includes("turn") ||
    lowerColumn.includes("snr") ||
    lowerColumn.includes("pitch") ||
    lowerColumn.includes("component") ||
    lowerColumn.includes("score") ||
    lowerColumn.includes("confidence")
  ) {
    const numericValue = Number(rawValue);

    if (Number.isFinite(numericValue)) {
      return String(Math.round(numericValue));
    }
  }

  return rawValue;
}

function normalizeStatus(status?: string): string {
  const value = String(status || "")
    .trim()
    .toLowerCase();

  if (!value || value === "na") {
    return "NA";
  }

  if (value.includes("need")) {
    return "Needs Check";
  }

  if (value.includes("review")) {
    return "Review";
  }

  if (value.includes("watch")) {
    return "Watch";
  }

  if (value.includes("good") || value.includes("ok")) {
    return "Good";
  }

  return status || "NA";
}

function getMajorityStatus(rows: CsvRow[], bandColumn: string): string {
  if (!rows.length) return "NA";

  const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
    const status = normalizeStatus(row[bandColumn]);

    if (status !== "NA") {
      counts[status] = (counts[status] || 0) + 1;
    }

    return counts;
  }, {});

  const sortedStatuses = Object.entries(statusCounts).sort(
    (a, b) => b[1] - a[1],
  );

  return sortedStatuses[0]?.[0] || "NA";
}

function getLongTurnStatus(totalLongTurns: number | string): string {
  if (totalLongTurns === "NA") return "NA";

  const count = toNumber(totalLongTurns);

  if (count === 0) return "Good";
  if (count <= 2) return "Watch";

  return "Needs Check";
}

function titleCaseColumn(column: string): string {
  const labelMap: Record<string, string> = {
    call_id: "Call ID",
    agent: "Agent",
    call_type: "Call Type",
    sop_call_type: "SOP Call Type",
    call_duration_sec: "Call Duration",
    talk_ratio: "Talk Ratio",
    silence: "Silence",
    talkover: "Talk-over",
    talkover_duration_sec: "Talk-over Duration",
    customer_talkover: "Customer Talk-over",
    customer_talkover_duration_sec: "Customer Talk-over Duration",
    agent_wpm: "Agent WPM",
    long_agent_turn_count: "Long Turns",
    audio_metrics_available: "Audio Metrics Available",
    audio_format: "Audio Format",
    audio_channels: "Audio Channels",
    sample_width_bytes: "Sample Width Bytes",
    snr: "SNR",
    pitch_variability: "Pitch Variability",
    customer_experience_concern_call_flag: "Customer Concern",
  };

  if (labelMap[column]) {
    return labelMap[column];
  }

  return column
    .replaceAll("_", " ")
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
    trimmedText.startsWith("<!doctype html") ||
    trimmedText.startsWith("<html") ||
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
          Object.values(row).some((value) => String(value || "").trim() !== ""),
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
    "customer_talkover_rate_pct",
  );

  if (hasCustomerTalkover) {
    return rows;
  }

  const hasTotalTalkover = Object.prototype.hasOwnProperty.call(
    rows[0],
    "talkover_rate_pct",
  );

  const hasAgentTalkover = Object.prototype.hasOwnProperty.call(
    rows[0],
    "agent_talkover_rate_pct",
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

function statusBadge(
  status?: string,
): { tone: StatusTone; label: string } | undefined {
  const normalized = normalizeStatus(status);
  if (normalized === "NA") return undefined;
  return { tone: toneForBand(normalized), label: normalized };
}

function bandedCell(value: string, band?: string) {
  const bandLabel = String(band ?? "").trim();
  const showPill = bandLabel && bandLabel.toUpperCase() !== "NA";

  return (
    <div className="flex items-center gap-2">
      <span>{value}</span>
      {showPill && (
        <StatusPill tone={toneForBand(bandLabel)} label={bandLabel} />
      )}
    </div>
  );
}

/** Builds the generic turn-level columns while combining Agent Name and Agent ID. */
function buildGenericColumns(rows: CsvRow[]): TableColumn<CsvRow>[] {
  if (!rows.length) return [];

  const sourceColumns = Object.keys(rows[0]);
  const hasAgentName = sourceColumns.includes("agent_name");
  const hasAgentId = sourceColumns.includes("agent_id");
  const filteredColumns = sourceColumns.filter(
    (column) => column !== "agent_name" && column !== "agent_id",
  );

  const columns: TableColumn<CsvRow>[] = [];
  const insertionIndex = filteredColumns.findIndex((column) =>
    ["call_type", "sop_call_type", "call_id"].includes(column),
  );

  const agentColumn: TableColumn<CsvRow> = {
    key: "agent",
    header: "Agent",
    minWidth: "150px",
    render: (row) => {
      const values = [row.agent_name, row.agent_id]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      return values.length ? (
        <div className="whitespace-pre-line">{values.join("\n")}</div>
      ) : (
        "NA"
      );
    },
  };

  filteredColumns.forEach((column, index) => {
    if ((hasAgentName || hasAgentId) && index === Math.max(insertionIndex, 0)) {
      columns.push(agentColumn);
    }

    columns.push({
      key: column,
      header: titleCaseColumn(column),
      minWidth: column.length > 18 ? "170px" : "130px",
      render: (row) => formatTableValue(column, row[column]),
    });
  });

  if (
    (hasAgentName || hasAgentId) &&
    !columns.some((column) => column.key === "agent")
  ) {
    columns.unshift(agentColumn);
  }

  return columns;
}

function HoverScrollTable({
  columns,
  rows,
  rowKey,
  emptyMessage = "No data available.",
}: {
  columns: TableColumn<CsvRow>[];
  rows: CsvRow[];
  rowKey: (row: CsvRow, index: number) => string;
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-2xl border border-accent-secondary/40 bg-surface p-5">
      {!rows.length ? (
        <div className="rounded-xl border border-white/40 bg-black p-4 text-sm text-text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="agent-table-scroll max-h-[360px] overflow-auto rounded-xl border border-white/60 bg-black">
          <table className="min-w-max border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface text-text-primary">
              <tr className="border-b-2 border-white/80">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-normal break-words border border-white/40 px-3 py-3 align-top font-semibold leading-snug"
                    style={{
                      minWidth: column.minWidth ?? "130px",
                      maxWidth: "190px",
                    }}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={rowKey(row, index)} className="bg-black">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="whitespace-pre-line break-words border border-white/35 px-3 py-3 align-top text-text-primary"
                      style={{
                        minWidth: column.minWidth ?? "130px",
                        maxWidth: "220px",
                      }}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const AGENT_SUMMARY_COLUMNS: TableColumn<CsvRow>[] = [
  {
    key: "call_id",
    header: "Call ID",
    minWidth: "110px",
    render: (row) => row.call_id || "NA",
  },
  {
    key: "agent",
    header: "Agent",
    minWidth: "140px",
    render: (row) => {
      const values = [row.agent_name, row.agent_id].filter((value) =>
        String(value || "").trim(),
      );
      return values.length ? (
        <div className="whitespace-pre-line">{values.join("\n")}</div>
      ) : (
        "NA"
      );
    },
  },
  {
    key: "call_type",
    header: "Call Type",
    minWidth: "170px",
    render: (row) => row.call_type || "NA",
  },
  {
    key: "sop_call_type",
    header: "SOP Call Type",
    minWidth: "135px",
    render: (row) => row.sop_call_type || "NA",
  },
  {
    key: "call_duration_sec",
    header: "Call Duration",
    minWidth: "135px",
    render: (row) => formatDurationMinutesSeconds(row.call_duration_sec),
  },
  {
    key: "talk_ratio",
    header: "Talk Ratio",
    minWidth: "135px",
    render: (row) =>
      bandedCell(
        formatPercentValue(row.agent_talk_ratio_pct),
        row.agent_talk_ratio_band,
      ),
  },
  {
    key: "silence",
    header: "Silence",
    minWidth: "125px",
    render: (row) =>
      bandedCell(
        formatPercentValue(row.silence_ratio_pct),
        row.silence_ratio_band,
      ),
  },
  {
    key: "talkover",
    header: "Talk-over",
    minWidth: "135px",
    render: (row) =>
      bandedCell(
        formatPercentValue(row.agent_talkover_rate_pct),
        row.agent_talkover_rate_band,
      ),
  },
  {
    key: "talkover_duration",
    header: "Talk-over Duration",
    minWidth: "155px",
    render: (row) => formatNumberValue(row.agent_talkover_duration_sec),
  },
  {
    key: "customer_talkover",
    header: "Customer Talk-over",
    minWidth: "165px",
    render: (row) =>
      bandedCell(
        formatPercentValue(row.customer_talkover_rate_pct),
        row.customer_talkover_rate_band,
      ),
  },
  {
    key: "customer_talkover_duration",
    header: "Customer Talk-over Duration",
    minWidth: "180px",
    render: (row) => formatNumberValue(row.customer_talkover_duration_sec),
  },
  {
    key: "agent_wpm",
    header: "Agent WPM",
    minWidth: "135px",
    render: (row) =>
      bandedCell(formatNumberValue(row.agent_wpm), row.agent_wpm_band),
  },
  {
    key: "long_turns",
    header: "Long Turns",
    minWidth: "115px",
    render: (row) => formatNumberValue(row.long_agent_turn_count),
  },
  {
    key: "audio_metrics_available",
    header: "Audio Metrics Available",
    minWidth: "175px",
    render: (row) => row.audio_metrics_available || "NA",
  },
  {
    key: "audio_format",
    header: "Audio Format",
    minWidth: "140px",
    render: (row) => row.audio_format || "NA",
  },
  {
    key: "audio_channels",
    header: "Audio Channels",
    minWidth: "140px",
    render: (row) => formatNumberValue(row.audio_channels),
  },
  {
    key: "sample_width_bytes",
    header: "Sample Width Bytes",
    minWidth: "165px",
    render: (row) => formatNumberValue(row.sample_width_bytes),
  },
  {
    key: "snr",
    header: "SNR",
    minWidth: "125px",
    render: (row) =>
      bandedCell(formatNumberValue(row.snr_db_approx), row.snr_band),
  },
  {
    key: "pitch_variability",
    header: "Pitch Variability",
    minWidth: "155px",
    render: (row) =>
      bandedCell(
        formatNumberValue(row.pitch_std_hz_approx),
        row.pitch_variability_band,
      ),
  },
  {
    key: "customer_concern",
    header: "Customer Concern",
    minWidth: "160px",
    render: (row) => row.customer_experience_concern_call_flag || "NA",
  },
];

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
        title=""
        tabs={[
          {
            key: "turn-level-flow",
            label: "Turn-Level Flow",
            available: qualityTurnRows.length > 0,
            content: qualityTurnRows.length ? (
              <div className="w-full max-h-[420px] overflow-auto [&>div]:overflow-visible">
                <DataTable columns={buildGenericColumns(qualityTurnRows)} rows={qualityTurnRows} rowKey={(_row, index) => String(index)} />
              </div>
            ) : (
              <p className="p-4 text-sm text-text-muted">
                Turn-level agent performance details not available.
              </p>
            ),
          },
          {
            key: "sentiment-evidence",
            label: "Sentiment Evidence",
            available:
              sentimentTurnRows.length > 0 || negativeTurnRows.length > 0,
            content: (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-text-primary">
                  Customer Experience Concern Evidence
                </h2>

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

                <h2 className="text-xl font-semibold text-text-primary">
                  All Turn-Level Sentiment Audit
                </h2>

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
            key: "transcript",
            label: "Transcript",
            available: transcriptRows.length > 0,
            content: <TranscriptView turns={transcriptRows} />,
          },
        ]}
      />
    </div>
  );
}

export default function AgentPerformanceMetrics() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [selectedCallId, setSelectedCallId] = useState("");
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

    loadCsv(
      `/data/turn_level/${selectedCallId}_negative_sentiment_turns.csv`,
    ).then(setNegativeTurnRows);

    loadCsv(`/data/turn_level/${selectedCallId}_turns.csv`).then(
      setTranscriptRows,
    );
  }, [selectedCallId]);

  const callIds = useMemo(() => {
    return rows
      .map((row) => row.call_id)
      .filter(Boolean)
      .sort();
  }, [rows]);

  const totalLongTurns = sumOrNa(rows, "long_agent_turn_count");

  const displayRows = useMemo(
    () => sliceRows(rows, rowsToShow),
    [rows, rowsToShow],
  );

  const kpiTiles: Tile[] = [
    { kind: "stat", label: "Calls Processed", value: String(rows.length) },
    {
      kind: "stat",
      label: "Avg Call Duration",
      value: formatDurationMinutesSeconds(meanOrNa(rows, "call_duration_sec")),
    },
    {
      kind: "stat",
      label: "Avg Talktime",
      value: formatPercentValue(meanOrNa(rows, "agent_talk_ratio_pct")),
      status: statusBadge(getMajorityStatus(rows, "agent_talk_ratio_band")),
    },
    {
      kind: "stat",
      label: "Avg Silence",
      value: formatPercentValue(meanOrNa(rows, "silence_ratio_pct")),
      status: statusBadge(getMajorityStatus(rows, "silence_ratio_band")),
    },
    {
      kind: "stat",
      label: "Avg Talk-over Rate",
      value: formatPercentValue(meanOrNa(rows, "agent_talkover_rate_pct")),
      status: statusBadge(getMajorityStatus(rows, "agent_talkover_rate_band")),
    },
    {
      kind: "stat",
      label: "Avg WPM",
      value: formatNumberValue(meanOrNa(rows, "agent_wpm")),
      status: statusBadge(getMajorityStatus(rows, "agent_wpm_band")),
    },
    {
      kind: "stat",
      label: "Total Long Turns",
      value: formatNumberValue(totalLongTurns),
      status: statusBadge(getLongTurnStatus(totalLongTurns)),
    },
    {
      kind: "stat",
      label: "Avg Customer Talk-over Rate",
      value: formatPercentValue(meanOrNa(rows, "customer_talkover_rate_pct")),
      status: statusBadge(
        getMajorityStatus(rows, "customer_talkover_rate_band"),
      ),
    },
  ];

  return (
    <PageContainer title="Agent Performance Metrics">
      <style>
        {`
          .agent-table-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .agent-table-scroll::-webkit-scrollbar {
            width: 0;
            height: 0;
          }

          .agent-table-scroll:hover {
            scrollbar-width: thin;
          }

          .agent-table-scroll:hover::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }

          .agent-table-scroll:hover::-webkit-scrollbar-track {
            background: transparent;
          }

          .agent-table-scroll:hover::-webkit-scrollbar-thumb {
            background: #8a8a8a;
            border-radius: 999px;
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

              {rowsToShow !== "all" && rows.length > displayRows.length ? (
                <p className="text-sm text-text-muted">
                  Showing {displayRows.length} of {rows.length} calls.
                </p>
              ) : null}
              <HoverScrollTable
                columns={AGENT_SUMMARY_COLUMNS}
                rows={displayRows}
                rowKey={(row, index) => `${row.call_id}-${index}`}
                emptyMessage="No data available."
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
