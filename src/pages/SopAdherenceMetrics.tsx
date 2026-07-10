import { useMemo, useState } from 'react';
import PageContainer from '../layout/PageContainer';
import Section from '../layout/Section';
import { useSopAdherenceData } from '../hooks/useSopAdherenceData';
import { SOP_CALL_LEVEL_SUMMARY_COLUMNS } from '../lib/data/sopAdherenceData';
import SopKpiGrid from '../components/sop-adherence/SopKpiGrid';
import RowsToShowSelect, { sliceRows, type RowsToShow } from '../components/sop-adherence/RowsToShowSelect';
import SopAreaAdherenceTable from '../components/sop-adherence/SopAreaAdherenceTable';
import RecurringNonAdherenceTable from '../components/sop-adherence/RecurringNonAdherenceTable';
import SequenceAdherenceTable from '../components/sop-adherence/SequenceAdherenceTable';
import SopDrilldownTable from '../components/executive-story/SopDrilldownTable';
import Accordion from '../components/executive-story/Accordion';
import TableCard from '../components/executive-story/TableCard';
import CallSelector from '../components/executive-story/CallSelector';
import CallDetailInspector from '../components/executive-story/CallDetailInspector';

export default function SopAdherenceMetrics() {
  const { data, loading, error } = useSopAdherenceData();
  const [rowsToShow, setRowsToShow] = useState<RowsToShow>(10);
  const [selectedCallId, setSelectedCallId] = useState('');

  const visibleCallLevelSummary = useMemo(() => {
    if (!data) return [];
    return sliceRows(data.callLevelSummary, rowsToShow);
  }, [data, rowsToShow]);

  return (
    <PageContainer title="SOP Adherence Metrics">
      {loading && <p className="text-text-muted">Loading SOP adherence data…</p>}
      {error && <p className="text-status-critical">Failed to load SOP adherence data: {error}</p>}

      {data && (
        <>
          <Section title="Key Metrics">
            <SopKpiGrid callsProcessed={data.callsProcessed} kpi={data.kpiSummary} />
          </Section>

          <Section title="Call-Level SOP Adherence Summary">
            <div className="flex flex-col gap-4">
              <RowsToShowSelect value={rowsToShow} onChange={setRowsToShow} />
              <TableCard>
                <SopDrilldownTable rows={visibleCallLevelSummary} columns={SOP_CALL_LEVEL_SUMMARY_COLUMNS} />
              </TableCard>
            </div>
          </Section>

          <Section title="Aggregate SOP Area Patterns">
            <div className="flex flex-col gap-4">
              <Accordion title="SOP Area Adherence">
                <SopAreaAdherenceTable rows={data.sopAreaFull} />
              </Accordion>

              <Accordion title="Recurring SOP Non-Adherence">
                <RecurringNonAdherenceTable rows={data.frequentNonAdherenceFull} />
              </Accordion>

              <Accordion title="Calls With Lowest SOP Sequence Adherence">
                <SequenceAdherenceTable rows={data.sequenceAdherenceDetail} />
              </Accordion>
            </div>
          </Section>

          <Section title="Detailed Check">
            <div className="flex flex-col gap-4">
              <CallSelector callIds={data.sopOnlyCallIds} selectedCallId={selectedCallId} onChange={setSelectedCallId} />

              {selectedCallId ? (
                <CallDetailInspector callId={selectedCallId} showAgentPerformance={false} title={`SOP Detail: ${selectedCallId}`} />
              ) : (
                <p className="rounded-lg border border-accent-secondary/30 bg-surface p-4 text-sm text-text-muted">
                  Select a call above to view its detailed SOP inspection.
                </p>
              )}
            </div>
          </Section>
        </>
      )}
    </PageContainer>
  );
}
