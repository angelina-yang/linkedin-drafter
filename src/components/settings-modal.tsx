"use client";

import { useEffect, useState } from "react";
import { clearApiKey, readApiKey, writeApiKey } from "@/lib/storage";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyChange: (key: string | null) => void;
}

function maskKey(key: string): string {
  if (key.length <= 12) return "••••••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export function SettingsModal({ isOpen, onClose, onApiKeyChange }: Props) {
  const [stored, setStored] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  // Required financial-responsibility consent. Pre-acknowledge if user is
  // editing a key they already saved (they consented previously).
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const k = readApiKey();
      setStored(k);
      setDraft("");
      setEditing(!k);
      setResetConfirm(false);
      setAcknowledged(k !== null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!acknowledged) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    writeApiKey(trimmed);
    setStored(trimmed);
    setDraft("");
    setEditing(false);
    onApiKeyChange(trimmed);
  };

  const handleClear = () => {
    clearApiKey();
    setStored(null);
    setEditing(true);
    onApiKeyChange(null);
  };

  const handleResetAll = () => {
    try {
      const keys = Object.keys(window.localStorage);
      for (const k of keys) {
        if (k.startsWith("tlin:")) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
    // Hard reload so every component re-reads localStorage fresh.
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "var(--bg-backdrop)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl w-full max-w-md mx-4 p-5 max-h-[85vh] overflow-y-auto"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-secondary)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-lg"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Anthropic API key */}
        <section className="mb-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Anthropic API key
            </h3>
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
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Saved on this device only, inside your browser. Never sent to our server, never logged.
          </p>

          {/* Spending-cap recommendation banner — shown above the input so
              users see it before pasting. */}
          {editing && (
            <div
              className="rounded-lg px-3 py-2.5 mt-3 text-xs leading-relaxed"
              style={{
                background: "rgba(234, 179, 8, 0.12)",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>
                Set a hard spending cap first.
              </strong>{" "}
              TL;IN does not enforce, monitor, or limit your provider charges.
              Set a monthly cap in your{" "}
              <a
                href="https://console.anthropic.com/settings/limits"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                Anthropic dashboard
              </a>{" "}
              before pasting your key.
            </div>
          )}

          {!editing && stored ? (
            <div className="mt-3 flex items-center gap-2">
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

              {/* Required financial-responsibility consent — checkbox must
                  be ticked before Save activates. Click-time clickwrap. */}
              <label
                className="flex items-start gap-2.5 cursor-pointer pt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded shrink-0"
                  style={{ accentColor: "var(--accent)" }}
                />
                <span className="text-xs leading-relaxed">
                  I understand that I am solely responsible for all charges
                  incurred at my chosen API provider through TL;IN, and that
                  TwoSetAI cannot see, pause, refund, or limit those charges.
                  I have set a hard spending cap in my provider account, or I
                  accept full responsibility if I have not.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2">
                {stored && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setDraft("");
                    }}
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!draft.trim() || !acknowledged}
                  className="rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                  style={{ background: "var(--accent)" }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Reset all data */}
        <section
          className="pt-4"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Clear all my data
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Removes your API key, goal, format, example posts, instructions, and session spend from this browser. Your registered name and email stay with TwoSetAI.
          </p>
          {!resetConfirm ? (
            <button
              type="button"
              onClick={() => setResetConfirm(true)}
              className="mt-3 text-xs"
              style={{ color: "#ef4444" }}
            >
              Clear my data →
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Sure? This can&apos;t be undone.
              </span>
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="rounded px-3 py-1 text-xs font-medium text-white"
                style={{ background: "#ef4444" }}
              >
                Clear everything
              </button>
            </div>
          )}
        </section>

        {/* Footer note */}
        <p className="mt-5 text-[11px]" style={{ color: "var(--text-faint)" }}>
          TL;IN is BYOK. You pay the AI provider directly, pennies per draft. No subscription, no account, nothing stored on our server.
        </p>
      </div>
    </div>
  );
}
