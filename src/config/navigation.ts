export interface NavTab {
  path: string;
  label: string;
}

export const navTabs: NavTab[] = [
  { path: '/executive-story', label: 'Executive Story' },
  { path: '/sop-adherence', label: 'SOP Adherence Metrics' },
  { path: '/agent-performance', label: 'Agent Performance Metrics' },
  { path: '/metric-glossary', label: 'Metric Glossary' },
];
