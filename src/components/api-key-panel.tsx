"use client";

import { useEffect, useState } from "react";
import { readApiKey, writeApiKey, clearApiKey } from "@/lib/storage";

interface Props {
  onChange: (key: string | null) => void;
}

function maskKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export function ApiKeyPanel({ onChange }: Props) {
  const [stored, setStored] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const k = readApiKey();
    setStored(k);
    onChange(k);
    // If nothing stored yet, open in editing mode so the user can paste.
    if (!k) setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    writeApiKey(trimmed);
    setStored(trimmed);
    setDraft("");
    setEditing(false);
    onChange(trimmed);
  };

  const handleClear = () => {
    clearApiKey();
    setStored(null);
    setEditing(true);
    onChange(null);
  };

  return (
    <section
      className="rounded-lg p-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          🔑 Anthropic API key
        </h2>
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs"
          style={{ color: "var(--accent)" }}
        >
          Get one →
        </a>
      </div>

      {!editing && stored ? (
        <div className="mt-3 flex items-center gap-3">
          <code
            className="flex-1 rounded px-2 py-1.5 text-xs font-mono"
            style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
          >
            {maskKey(stored)}
          </code>
          <button
            type="button"
            onClick={() => {
              setDraft(stored);
              setEditing(true);
            }}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded px-3 py-2 text-sm font-mono"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-secondary)",
              color: "var(--text-primary)",
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              Stored only in your browser. Never sent to our server.
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.trim()}
              className="rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
