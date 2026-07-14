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
import SopInspectorTabs from '../components/executive-story/SopInspectorTabs';
import AgentPerformanceInspectorTabs from '../components/executive-story/AgentPerformanceInspectorTabs';

export default function ExecutiveStory() {
  const { data, loading, error } = useExecutiveStoryData();
  const [selectedCallId, setSelectedCallId] = useState('');
  const [sopDrilldownOpen, setSopDrilldownOpen] = useState(false);
  const [agentDrilldownOpen, setAgentDrilldownOpen] = useState(false);

  const handleCallIdChange = (callId: string) => {
    setSelectedCallId(callId);
    setSopDrilldownOpen(Boolean(callId));
    setAgentDrilldownOpen(Boolean(callId));
  };

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

          <Section title="Executive Signals" caption="These signals summarize SOP adherence and agent performance patterns from the analyzed calls.">
            <TableCard>
              <SignalsTable rows={data.signals} />
            </TableCard>
          </Section>

          <Section
            title="Top 5 Calls With Lowest Adherence"
            caption="This section highlights calls that need attention."
          >
            <TableCard>
              <PriorityCallsTable rows={data.priorityCalls} />
            </TableCard>
          </Section>

          <Section title="Detailed Check">
            <div className="flex flex-col gap-4">
              <CallSelector callIds={data.callIds} selectedCallId={selectedCallId} onChange={handleCallIdChange} />

              <Accordion
                title="SOP Adherence Drilldown"
                open={sopDrilldownOpen}
                onToggle={setSopDrilldownOpen}
              >
                <div className="flex flex-col gap-4">
                  <SopDrilldownTable rows={filteredSopDrilldown} />
                  {selectedCallId && <SopInspectorTabs callId={selectedCallId} />}
                </div>
              </Accordion>

              <Accordion
                title="Agent Performance Drilldown"
                open={agentDrilldownOpen}
                onToggle={setAgentDrilldownOpen}
              >
                <div className="flex flex-col gap-4">
                  <AgentDrilldownTable rows={filteredAgentDrilldown} />
                  {selectedCallId && <AgentPerformanceInspectorTabs callId={selectedCallId} />}
                </div>
              </Accordion>
            </div>
          </Section>
        </>
      )}
    </PageContainer>
  );
}
