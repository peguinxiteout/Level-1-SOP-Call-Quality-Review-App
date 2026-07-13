import type { ReactNode } from 'react';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}

export default function Accordion({ title, defaultOpen = true, open, onToggle, children }: AccordionProps) {
  const isOpen = open !== undefined ? open : defaultOpen;

  return (
    <details
      className="group rounded-lg border border-accent-secondary/30 bg-surface"
      open={isOpen}
      onToggle={onToggle ? (event) => onToggle(event.currentTarget.open) : undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary">
        {title}
        <span className="text-text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-accent-secondary/20 p-4">{children}</div>
    </details>
  );
}
