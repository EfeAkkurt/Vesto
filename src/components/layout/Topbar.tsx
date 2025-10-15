"use client";

type TopbarProps = {
  onToggleSidebar?: () => void;
  onToggleCollapse?: () => void;
  isSidebarCollapsed?: boolean;
};

export const Topbar = ({ onToggleSidebar, onToggleCollapse, isSidebarCollapsed }: TopbarProps) => (
  <header className="sticky top-0 z-30 border-b border-border/40 bg-background/60 backdrop-blur-xl">
    <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border/40 bg-card/50 text-foreground/70 transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:hidden"
          aria-label="Open navigation"
        >
          <svg aria-hidden className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onToggleCollapse?.()}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border/40 bg-card/50 text-foreground/70 transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            aria-hidden
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {isSidebarCollapsed ? (
              <path d="M10 6l4 6-4 6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M14 6l-4 6 4 6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden md:flex h-10 items-center gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 text-sm text-muted-foreground">
          <svg aria-hidden className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span>Search (soon)</span>
        </div>
      </div>
    </div>
  </header>
);
