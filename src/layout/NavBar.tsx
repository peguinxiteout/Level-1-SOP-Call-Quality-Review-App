import { NavLink } from 'react-router-dom';
import { navTabs } from '../config/navigation';

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-accent-secondary/40 bg-background/95 shadow-md shadow-black/20 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-primary"
              aria-hidden="true"
            >
              <path d="M3 3v18h18" />
              <path d="M7 15l4-4 3 3 5-6" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-text-primary sm:text-base">
              SOP Adherence &amp; Agent Performance
            </p>
            <p className="text-xs text-text-muted">Call Center Analytics Dashboard</p>
          </div>
        </div>

        <nav
          aria-label="Main"
          className="flex flex-wrap gap-1 rounded-full bg-surface p-1 md:flex-nowrap"
        >
          {navTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  isActive
                    ? 'bg-accent text-text-primary'
                    : 'text-text-muted hover:bg-accent-secondary/40 hover:text-text-primary'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
