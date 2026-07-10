import { computeActualContext, type SopItemRow } from '../../lib/calculations/executiveStoryCalculations';
import type { StatusTone } from '../../lib/ui/status';
import DataTable, { type DataTableColumn } from './DataTable';
import StatusPill from './StatusPill';
import { formatCell } from './formatters';

const STATUS_TONE_MAP: Record<string, StatusTone> = {
  Confirmed: 'good',
  'Review Suggested': 'warning',
  'Missed / Not Evidenced': 'critical',
  'Not Applicable': 'neutral',
};

const columns: DataTableColumn<SopItemRow>[] = [
  { key: 'item_id', header: 'Item ID', accessor: (r) => r.item_id, render: (r) => formatCell(r.item_id) },
  { key: 'category', header: 'Category', accessor: (r) => r.category, render: (r) => formatCell(r.category) },
  { key: 'sub_category', header: 'Sub-Category', accessor: (r) => r.sub_category, render: (r) => formatCell(r.sub_category) },
  { key: 'item_text', header: 'Item Text', accessor: (r) => r.item_text, render: (r) => formatCell(r.item_text) },
  {
    key: 'expected_agent_utterance',
    header: 'Expected Agent Utterance',
    accessor: (r) => String(r.expected_agent_utterance ?? ''),
    render: (r) => formatCell(r.expected_agent_utterance),
  },
  {
    key: 'actual_context',
    header: 'Actual Context',
    accessor: (r) => computeActualContext(r),
    render: (r) => formatCell(computeActualContext(r)),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: (r) => r.status,
    render: (r) => {
      const text = formatCell(r.status);
      if (text === '—') return text;
      return <StatusPill tone={STATUS_TONE_MAP[text] ?? 'neutral'} label={text} />;
    },
  },
  { key: 'llm_reason', header: 'LLM Reason', accessor: (r) => String(r.llm_reason ?? ''), render: (r) => formatCell(r.llm_reason) },
  {
    key: 'llm_confidence',
    header: 'LLM Confidence',
    accessor: (r) => Number(r.llm_confidence),
    render: (r) => formatCell(r.llm_confidence),
  },
];

export default function SopResultTable({ rows }: { rows: SopItemRow[] }) {
  return <DataTable columns={columns} rows={rows} rowKey={(row, index) => String(row.item_id ?? index)} />;
}
