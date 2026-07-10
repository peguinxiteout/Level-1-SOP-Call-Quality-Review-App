import { useMemo, useState } from 'react';
import PageContainer from '../layout/PageContainer';
import Section from '../layout/Section';
import { useExecutiveStoryData } from '../hooks/useExecutiveStoryData';
import KpiGrid from '../components/executive-story/KpiGrid';
import PriorityCallsTable from '../components/executive-story/PriorityCallsTable';
import SignalsTable from '../components/executive-story/SignalsTable';
import SopDrilldownTable from '../components/executive-story/SopDrilldownTable';
import AgentDrilldownTable from '../components/executive-story/AgentDrilldownTable';
import Accordion from '../components/executive-story/Accordion';
import TableCard from '../components/executive-story/TableCard';
import CallSelector from '../components/executive-story/CallSelector';
import CallDetailInspector from '../components/executive-story/CallDetailInspector';

export default function ExecutiveStory() {
  const { data, loading, error } = useExecutiveStoryData();
  const [selectedCallId, setSelectedCallId] = useState('');

  const filteredSopDrilldown = useMemo(() => {
    if (!data) return [];
    return selectedCallId ? data.sopDrilldown.filter((row) => row.call_id === selectedCallId) : data.sopDrilldown;
  }, [data, selectedCallId]);

  const filteredAgentDrilldown = useMemo(() => {
    if (!data) return [];
    return selectedCallId ? data.agentDrilldown.filter((row) => row.call_id === selectedCallId) : data.agentDrilldown;
  }, [data, selectedCallId]);

  return (
    <PageContainer title="Executive Story">
      {loading && <p className="text-text-muted">Loading executive story data…</p>}
      {error && <p className="text-status-critical">Failed to load executive story data: {error}</p>}

      {data && (
        <>
          <Section title="Key Metrics">
            <KpiGrid kpi={data.kpiSummary} />
          </Section>

          <Section title="Executive Signals">
            <TableCard>
              <SignalsTable rows={data.signals} />
            </TableCard>
          </Section>

          <Section
            title="Top 5 Calls With Lowest Adherence"
            caption="Ranked by a composite attention score based on SOP misses, coverage gaps, and quality review flags — not a literal lowest-to-highest sort."
          >
            <TableCard>
              <PriorityCallsTable rows={data.priorityCalls} />
            </TableCard>
          </Section>

          <Section title="Detailed Check">
            <div className="flex flex-col gap-4">
              <CallSelector callIds={data.callIds} selectedCallId={selectedCallId} onChange={setSelectedCallId} />

              <Accordion title="SOP Adherence Drilldown">
                <SopDrilldownTable rows={filteredSopDrilldown} />
              </Accordion>

              <Accordion title="Agent Performance Drilldown">
                <AgentDrilldownTable rows={filteredAgentDrilldown} />
              </Accordion>

              {selectedCallId ? (
                <CallDetailInspector callId={selectedCallId} />
              ) : (
                <p className="rounded-lg border border-accent-secondary/30 bg-surface p-4 text-sm text-text-muted">
                  Select a call above to view its detailed SOP and agent performance inspection.
                </p>
              )}
            </div>
          </Section>
        </>
      )}
    </PageContainer>
  );
}
