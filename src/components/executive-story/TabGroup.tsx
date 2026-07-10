import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface TabSpec {
  key: string;
  label: string;
  available: boolean;
  content: ReactNode;
}

interface TabGroupProps {
  title: string;
  tabs: TabSpec[];
}

/** Tab strip where unavailable tabs (no data for this call) are grayed out and unselectable. */
export default function TabGroup({ title, tabs }: TabGroupProps) {
  const firstAvailable = tabs.find((t) => t.available)?.key ?? tabs[0]?.key;
  const [activeKey, setActiveKey] = useState(firstAvailable);

  useEffect(() => {
    setActiveKey(firstAvailable);
  }, [firstAvailable]);

  const activeTab = tabs.find((t) => t.key === activeKey);

  return (
    <div className="rounded-lg border border-accent-secondary/30 bg-surface p-4">
      <h4 className="mb-3 text-sm font-semibold text-text-primary">{title}</h4>
      <div className="flex flex-wrap gap-1 border-b border-accent-secondary/20 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => tab.available && setActiveKey(tab.key)}
            disabled={!tab.available}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeKey === tab.key
                ? 'bg-accent text-text-primary'
                : tab.available
                  ? 'text-text-muted hover:bg-accent-secondary/30 hover:text-text-primary'
                  : 'cursor-not-allowed text-text-muted/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeTab?.content}</div>
    </div>
  );
}
