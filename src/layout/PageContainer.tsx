import type { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  children: ReactNode;
}

export default function PageContainer({ title, children }: PageContainerProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">{title}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}
