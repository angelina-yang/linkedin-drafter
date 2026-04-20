"use client";

interface Props {
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export function AppHeader({ hasApiKey, onOpenSettings }: Props) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          {/* LinkedIn "in" glyph — matches favicon + Lab card */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            TL;IN
          </h1>
          <p className="text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>
            Articles, videos, notes → LinkedIn posts
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://buymeacoffee.com/angelinayang"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg transition-colors hover:text-yellow-400"
          style={{ color: "var(--text-muted)" }}
          title="Buy me a coffee"
          aria-label="Buy me a coffee"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21h18v-2H2v2zM20 8h-2V5h2v3zm0-5H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm-4 10c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V5h10v8zm4-5h-2V5h2v3z" />
          </svg>
        </a>
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: hasApiKey ? "var(--text-muted)" : undefined }}
          title={hasApiKey ? "Settings" : "Add your Anthropic API key to get started"}
          aria-label="Settings"
        >
          {!hasApiKey ? (
            <span className="text-yellow-400 animate-pulse inline-flex">
              <GearIcon />
            </span>
          ) : (
            <GearIcon />
          )}
        </button>
      </div>
    </header>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
