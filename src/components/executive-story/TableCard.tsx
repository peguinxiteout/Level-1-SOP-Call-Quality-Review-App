import type { ReactNode } from 'react';

/** Non-collapsible card shell matching Accordion's/TabGroup's card treatment, for tables rendered directly inside a Section. */
export default function TableCard({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-accent-secondary/30 bg-surface p-4">{children}</div>;
}
