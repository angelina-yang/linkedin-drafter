"use client";

import { useEffect, useState } from "react";

const LINKEDIN_MAX_CHARS = 3000;
const SEE_MORE_CUTOFF = 210;

interface Props {
  variants: string[];
  regenHookCost: string;
  regenFullCost: string;
  onEdit: (index: number, text: string) => void;
  onRegenHook: (index: number) => Promise<string | null>;
  onRegenFull: (index: number) => Promise<string | null>;
}

export function VariantTabs({
  variants,
  regenHookCost,
  regenFullCost,
  onEdit,
  onRegenHook,
  onRegenFull,
}: Props) {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<"hook" | "full" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (active >= variants.length) setActive(0);
  }, [variants.length, active]);

  if (variants.length === 0) return null;

  const handleRegenHook = async () => {
    setBusy("hook");
    setError(null);
    const err = await onRegenHook(active);
    setBusy(null);
    if (err) setError(err);
  };

  const handleRegenFull = async () => {
    setBusy("full");
    setError(null);
    const err = await onRegenFull(active);
    setBusy(null);
    if (err) setError(err);
  };

  return (
    <section
      className="rounded-lg p-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {variants.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className="rounded px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: active === i ? "var(--accent-surface)" : "transparent",
                color: active === i ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${active === i ? "var(--accent)" : "var(--border-secondary)"}`,
              }}
            >
              Variant {i + 1}
            </button>
          ))}
        </div>
        <CopyButton text={variants[active] ?? ""} />
      </div>

      <DraftEditor text={variants[active] ?? ""} onChange={(t) => onEdit(active, t)} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRegenHook()}
            disabled={busy !== null}
            className="rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-secondary)",
              color: "var(--text-primary)",
            }}
            title="Regenerate only the opening 1-2 lines — cheap, preserves the body"
          >
            {busy === "hook" ? "Regenerating hook…" : `↻ Regen hook (${regenHookCost})`}
          </button>
          <button
            type="button"
            onClick={() => void handleRegenFull()}
            disabled={busy !== null}
            className="rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-secondary)",
              color: "var(--text-primary)",
            }}
            title="Regenerate this whole variant with the same context"
          >
            {busy === "full" ? "Regenerating…" : `↻ Regen full (${regenFullCost})`}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
    </section>
  );
}

interface EditorProps {
  text: string;
  onChange: (text: string) => void;
}

function DraftEditor({ text, onChange }: EditorProps) {
  const charCount = text.length;
  const overLimit = charCount > LINKEDIN_MAX_CHARS;
  const nearLimit = charCount > LINKEDIN_MAX_CHARS * 0.85;
  const pastSeeMore = charCount > SEE_MORE_CUTOFF;

  const counterColor = overLimit
    ? "#ef4444"
    : nearLimit
      ? "#f59e0b"
      : "var(--text-muted)";

  return (
    <div className="mt-3">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        className="w-full rounded p-3 text-sm leading-relaxed whitespace-pre-wrap focus:outline-none"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-secondary)",
          color: "var(--text-primary)",
          fontFamily: "inherit",
        }}
      />
      <div className="mt-2 flex items-center justify-between text-xs">
        <span style={{ color: "var(--text-faint)" }}>
          {pastSeeMore ? (
            <>
              Hook ({SEE_MORE_CUTOFF} chars) · rest hidden behind &ldquo;see more&rdquo;
            </>
          ) : (
            <>Fits above the &ldquo;see more&rdquo; fold ({SEE_MORE_CUTOFF} chars)</>
          )}
        </span>
        <span style={{ color: counterColor, fontVariantNumeric: "tabular-nums" }}>
          {charCount.toLocaleString()} / {LINKEDIN_MAX_CHARS.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!text}
      className="rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
      style={{ background: "var(--accent)" }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
