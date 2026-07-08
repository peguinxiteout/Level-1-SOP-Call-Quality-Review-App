import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import ExecutiveStory from './pages/ExecutiveStory';
import SopAdherenceMetrics from './pages/SopAdherenceMetrics';
import AgentPerformanceMetrics from './pages/AgentPerformanceMetrics';
import MetricGlossary from './pages/MetricGlossary';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/executive-story" replace />} />
        <Route path="executive-story" element={<ExecutiveStory />} />
        <Route path="sop-adherence" element={<SopAdherenceMetrics />} />
        <Route path="agent-performance" element={<AgentPerformanceMetrics />} />
        <Route path="metric-glossary" element={<MetricGlossary />} />
        <Route path="*" element={<Navigate to="/executive-story" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
