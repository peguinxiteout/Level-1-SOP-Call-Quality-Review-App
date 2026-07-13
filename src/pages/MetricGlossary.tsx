import { useMemo, useState } from "react";
import PageContainer from "../layout/PageContainer";
import TableCard from "../components/executive-story/TableCard";

interface GlossaryRow {
  section: string;
  metric_name: string;
  definition: string;
  calculation: string;
  research_reference: string;
}

const glossaryRows: GlossaryRow[] = [
  {
    section: "SOP Adherence Metrics",
    metric_name: "SOP Adherence",
    definition:
      "Operational SOP adherence. Confirmed SOP and SOP needing review are counted as covered for business coverage.",
    calculation:
      "(Confirmed SOP + SOP to Check) / Total Applicable SOP * 100.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Confirmed SOP",
    definition: "SOP confirmed by rule score or LLM judge.",
    calculation: "Count of SOP rows where status = Confirmed.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "SOP to Check",
    definition:
      "SOP with partial or noisy evidence requiring manual confirmation.",
    calculation:
      "Count of SOP rows where status indicates manual review is recommended.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Missed SOP",
    definition: "SOP where agent evidence was missing or unrelated.",
    calculation:
      "Count of SOP rows where status = Missed / Not Evidenced.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Most Non-Adherence Area",
    definition:
      "SOP area with the highest non-adherence percentage among applicable SOP.",
    calculation:
      "Group SOP by category and sub-category, then sort by non-adherence percentage descending.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Most Frequent Missed SOP",
    definition:
      "SOP most frequently missed or needing manual review across the currently filtered calls.",
    calculation:
      "Group SOP results by SOP text and count rows where status is Missed / Not Evidenced or manual review is recommended.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Opening SOP Adherence",
    definition: "Operational adherence for SOP categorized as Opening.",
    calculation:
      "(Confirmed Opening SOP + Opening SOP to Check) / Total Applicable Opening SOP * 100.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Middle Section SOP Adherence",
    definition:
      "Operational adherence for SOP categorized as Middle Section.",
    calculation:
      "(Confirmed Middle Section SOP + Middle Section SOP to Check) / Total Applicable Middle Section SOP * 100.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Closure SOP Adherence",
    definition: "Operational adherence for SOP categorized as Closure.",
    calculation:
      "(Confirmed Closure SOP + Closure SOP to Check) / Total Applicable Closure SOP * 100.",
    research_reference: "",
  },
  {
    section: "SOP Adherence Metrics",
    metric_name: "Avg SOP Sequence Followed",
    definition:
      "Average percentage of observed SOP steps that followed the expected SOP order.",
    calculation:
      "Per call: (observed SOP steps - sequence breaks) / observed SOP steps * 100, then average across calls.",
    research_reference: "",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Avg Talktime",
    definition: "Share of call duration spoken by the agent.",
    calculation:
      "Average agent talk duration / call duration * 100 across calls.",
    research_reference: "",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Avg Call Duration",
    definition: "Average transcript-based call length.",
    calculation:
      "Average of last transcript turn end time - first transcript turn start time.",
    research_reference: "",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Avg Silence",
    definition:
      "Agent response silence after a customer turn. This excludes gaps before customer turns.",
    calculation:
      "Average of positive gaps where previous turn is Customer and next turn is Agent / call duration * 100.",
    research_reference: "https://en.wikipedia.org/wiki/Turn-taking",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Avg Talk-over Rate",
    definition:
      "Overlap rate where the agent starts speaking while the previous customer turn is still active. This is the interruption-oriented talk-over metric.",
    calculation:
      "Average agent-over-customer overlapped duration / call duration * 100.",
    research_reference: "https://en.wikipedia.org/wiki/Turn-taking",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Avg WPM",
    definition: "Agent speaking speed in words per minute.",
    calculation:
      "Average of agent word count / agent talk minutes across calls.",
    research_reference: "https://en.wikipedia.org/wiki/Words_per_minute",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Total Long Turns",
    definition: "Number of agent turns that exceed the long-turn rule.",
    calculation:
      "Count of agent turns where duration_sec > 30 seconds OR word_count > 80.",
    research_reference: "",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "SNR Band",
    definition:
      "Audio-quality band based on approximate signal-to-noise ratio.",
    calculation:
      "Good >= 25 dB; Watch 20-25 dB; Needs Check < 20 dB. SNR is approximated from high vs low RMS audio frames.",
    research_reference:
      "https://en.wikipedia.org/wiki/Signal-to-noise_ratio | https://en.wikipedia.org/wiki/Intelligibility_(communication)",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Pitch Variability Band",
    definition:
      "Secondary audio-quality signal based on approximate pitch standard deviation.",
    calculation:
      "Good 20-80 Hz; Watch 10-20 or 80-120 Hz; Needs Check outside that range. This is approximate and should be treated as a secondary signal.",
    research_reference: "",
  },
  {
    section: "Agent Performance Metrics",
    metric_name: "Calls Having Customer Concerns",
    definition:
      "Share of calls where a confirmed customer concern was found.",
    calculation:
      "Calls where customer_experience_concern_call_flag = Yes / total calls * 100.",
    research_reference: "",
  },
  {
    section: "Executive Story and Processing",
    metric_name: "Calls Analyzed",
    definition:
      "Number of calls currently available in the dashboard summary.",
    calculation:
      "Count of rows in batch_processing_time.csv, or the available SOP/agent performance summary rows when timing is unavailable.",
    research_reference: "",
  },
  {
    section: "Executive Story and Processing",
    metric_name: "Priority Level",
    definition:
      "Business-friendly call triage label for whether a call needs attention.",
    calculation:
      "High when missed SOP, low SOP adherence, or processing failure exists. Medium when SOP review or agent performance review bands exist. Otherwise OK.",
    research_reference: "",
  },
  {
    section: "Executive Story and Processing",
    metric_name: "Attention Score",
    definition:
      "Numeric sort score used to order calls in the lowest-adherence table. Higher score means the call should be checked earlier.",
    calculation:
      "(Missed SOP * 3) + SOP to Check + ((100 - SOP Adherence) / 10) + 2 for each quality band marked Needs Check + 10 if status is Failed.",
    research_reference: "",
  },
  {
    section: "Executive Story and Processing",
    metric_name: "Attention Reason",
    definition:
      "Plain-language reason why a call appears in the lowest-adherence table.",
    calculation:
      "Derived from missed SOP, SOP review, low adherence, failed processing, agent performance review bands, and audio metric errors.",
    research_reference: "",
  },
  {
    section: "Executive Story and Processing",
    metric_name: "Failed Calls",
    definition: "Calls where processing did not complete successfully.",
    calculation: "Count of rows where status = Failed.",
    research_reference: "",
  },
  {
    section: "Executive Story and Processing",
    metric_name: "Avg Processing Duration",
    definition:
      "Average local processing duration for successful calls.",
    calculation:
      "Average of total_processing_time_sec after excluding failed calls.",
    research_reference: "",
  },
];

const sectionOptions = [
  "All",
  ...Array.from(new Set(glossaryRows.map((row) => row.section))),
];

function ReferenceCell({ value }: { value: string }) {
  const references = value
    .split("|")
    .map((reference) => reference.trim())
    .filter(Boolean);

  if (!references.length) {
    return <span className="text-text-muted">NA</span>;
  }

  return (
    <>
      {references.map((reference) => {
        const isLink =
          reference.startsWith("http://") ||
          reference.startsWith("https://");

        if (isLink) {
          return (
            <div key={reference}>
              <a
                href={reference}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-300 underline underline-offset-2"
              >
                {reference}
              </a>
            </div>
          );
        }

        return <div key={reference}>{reference}</div>;
      })}
    </>
  );
}

function GlossaryTable({ rows }: { rows: GlossaryRow[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/40 bg-black p-4 text-sm text-text-muted">
        No glossary rows match the current filter.
      </div>
    );
  }

  return (
    <div className="glossary-table-scroll max-h-[610px] w-full overflow-y-auto overflow-x-hidden rounded-xl border border-white/60 bg-black">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[17%]" />
          <col className="w-[15%]" />
          <col className="w-[23%]" />
          <col className="w-[27%]" />
          <col className="w-[18%]" />
        </colgroup>

        <thead className="sticky top-0 z-10 bg-[#25215f] text-text-primary">
          <tr className="border-b-2 border-white/80">
            <th className="whitespace-normal break-words border border-white/45 px-3 py-3 align-top font-semibold leading-snug">
              Section
            </th>
            <th className="whitespace-normal break-words border border-white/45 px-3 py-3 align-top font-semibold leading-snug">
              Metric
            </th>
            <th className="whitespace-normal break-words border border-white/45 px-3 py-3 align-top font-semibold leading-snug">
              Definition
            </th>
            <th className="whitespace-normal break-words border border-white/45 px-3 py-3 align-top font-semibold leading-snug">
              Calculation
            </th>
            <th className="whitespace-normal break-words border border-white/45 px-3 py-3 align-top font-semibold leading-snug">
              Research Reference
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={`${row.section}-${row.metric_name}`} className="bg-black">
              <td className="whitespace-normal break-words border border-white/35 px-3 py-3 align-top leading-relaxed text-text-primary">
                {row.section || "NA"}
              </td>
              <td className="whitespace-normal break-words border border-white/35 px-3 py-3 align-top font-medium leading-relaxed text-text-primary">
                {row.metric_name || "NA"}
              </td>
              <td className="whitespace-normal break-words border border-white/35 px-3 py-3 align-top leading-relaxed text-text-primary">
                {row.definition || "NA"}
              </td>
              <td className="whitespace-normal break-words border border-white/35 px-3 py-3 align-top leading-relaxed text-text-primary">
                {row.calculation || "NA"}
              </td>
              <td className="whitespace-normal break-words border border-white/35 px-3 py-3 align-top leading-relaxed text-text-primary">
                <ReferenceCell value={row.research_reference} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MetricGlossary() {
  const [selectedSection, setSelectedSection] = useState("All");
  const [searchText, setSearchText] = useState("");

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return glossaryRows.filter((row) => {
      const matchesSection =
        selectedSection === "All" || row.section === selectedSection;

      const matchesSearch =
        !query ||
        Object.values(row).join(" ").toLowerCase().includes(query);

      return matchesSection && matchesSearch;
    });
  }, [selectedSection, searchText]);

  return (
    <PageContainer title="Metric Glossary">
      <style>
        {`
          .glossary-table-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .glossary-table-scroll::-webkit-scrollbar {
            width: 0;
            height: 0;
          }

          .glossary-table-scroll:hover {
            scrollbar-width: thin;
          }

          .glossary-table-scroll:hover::-webkit-scrollbar {
            width: 9px;
          }

          .glossary-table-scroll:hover::-webkit-scrollbar-track {
            background: transparent;
          }

          .glossary-table-scroll:hover::-webkit-scrollbar-thumb {
            background: #888888;
            border-radius: 999px;
          }

          .glossary-table-scroll:hover::-webkit-scrollbar-thumb:hover {
            background: #a0a0a0;
          }
        `}
      </style>
      <div className="space-y-6">
        <p className="text-text-muted">
          Use this as the common reference for metric names shown across
          Executive Story, SOP Adherence Metrics, Agent Performance Metrics,
          and Processing Duration.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Glossary section
            </label>

            <select
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
              className="w-full rounded-lg border border-accent-secondary/50 bg-surface px-4 py-3 text-text-primary outline-none"
            >
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Search glossary
            </label>

            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Example: SOP Adherence, Silence, Processing"
              className="w-full rounded-lg border border-accent-secondary/50 bg-surface px-4 py-3 text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </div>

        <TableCard>
          <GlossaryTable rows={filteredRows} />
        </TableCard>
      </div>
    </PageContainer>
  );
}