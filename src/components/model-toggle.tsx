"use client";

import type { ModelChoice } from "@/lib/storage";

interface Props {
  model: ModelChoice;
  onChange: (model: ModelChoice) => void;
}

const OPTIONS: Array<{ id: ModelChoice; label: string; tooltip: string }> = [
  { id: "quick", label: "Quick", tooltip: "Claude Haiku — fast and cheap, good for rough drafts" },
  { id: "polished", label: "Polished", tooltip: "Claude Sonnet — higher quality, still inexpensive" },
];

export function ModelToggle({ model, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg p-0.5"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border-secondary)",
      }}
    >
      {OPTIONS.map((opt) => {
        const active = model === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.tooltip}
            className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "white" : "var(--text-muted)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
