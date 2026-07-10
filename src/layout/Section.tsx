import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  caption?: string;
  children: ReactNode;
}

export default function Section({ title, caption, children }: SectionProps) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {caption && <p className="mt-1 text-sm text-text-muted">{caption}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
