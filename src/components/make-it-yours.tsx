"use client";

import { useState } from "react";

const MAX_EXAMPLES = 5;
const MAX_EXAMPLE_CHARS = 5000;
const MAX_INSTRUCTIONS_CHARS = 10000;

interface Props {
  examples: string[];
  instructions: string;
  onExamplesChange: (examples: string[]) => void;
  onInstructionsChange: (text: string) => void;
}

export function MakeItYours({
  examples,
  instructions,
  onExamplesChange,
  onInstructionsChange,
}: Props) {
  // Default: expanded on first visit when empty (so users discover the feature).
  // Once content is saved, collapse it next time to reduce visual noise.
  const hasContent = examples.some((e) => e.trim().length > 0) || instructions.trim().length > 0;
  const [expanded, setExpanded] = useState(!hasContent);

  const summary = buildSummary(examples, instructions);

  const updateExample = (index: number, value: string) => {
    const next = [...examples];
    next[index] = value.slice(0, MAX_EXAMPLE_CHARS);
    onExamplesChange(next);
  };

  const removeExample = (index: number) => {
    onExamplesChange(examples.filter((_, i) => i !== index));
  };

  const addExample = () => {
    if (examples.length >= MAX_EXAMPLES) return;
    onExamplesChange([...examples, ""]);
  };

  return (
    <section
      className="rounded-lg"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            ✍️ Make it yours
          </h2>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            {summary}
          </span>
        </div>
        <span style={{ color: "var(--text-muted)" }}>
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5">
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Paste 3-5 of your best posts so drafts sound like you. Totally optional. Saved in your browser.
            </p>
            <div className="mt-3 space-y-2">
              {examples.length === 0 && (
                <p className="text-xs italic" style={{ color: "var(--text-faint)" }}>
                  No examples yet.
                </p>
              )}
              {examples.map((ex, i) => (
                <ExampleSlot
                  key={i}
                  index={i}
                  value={ex}
                  onChange={(v) => updateExample(i, v)}
                  onRemove={() => removeExample(i)}
                />
              ))}
            </div>
            {examples.length < MAX_EXAMPLES && (
              <button
                type="button"
                onClick={addExample}
                className="mt-2 w-full rounded border-2 border-dashed py-2 text-xs"
                style={{
                  borderColor: "var(--border-secondary)",
                  color: "var(--text-muted)",
                }}
              >
                + Add example ({examples.length}/{MAX_EXAMPLES})
              </button>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              🗒️ Additional instructions
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              Brand voice, audience, things to avoid, or a custom post structure. Optional. Saved in your browser.
            </p>
            <textarea
              value={instructions}
              onChange={(e) =>
                onInstructionsChange(e.target.value.slice(0, MAX_INSTRUCTIONS_CHARS))
              }
              placeholder={'e.g., "I write for solo founders. Avoid corporate buzzwords." Or: "Structure as a before-after with one concrete number."'}
              rows={4}
              className="mt-2 w-full rounded px-3 py-2 text-sm focus:outline-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-secondary)",
                color: "var(--text-primary)",
              }}
            />
            <div className="mt-1 text-right text-[11px]" style={{ color: "var(--text-faint)" }}>
              {instructions.length}/{MAX_INSTRUCTIONS_CHARS}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

interface SlotProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}

function ExampleSlot({ index, value, onChange, onRemove }: SlotProps) {
  return (
    <div
      className="rounded-md p-3"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="text-xs font-medium pt-1.5"
          style={{ color: "var(--text-faint)" }}
        >
          {index + 1}.
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste one of your best LinkedIn posts here..."
          rows={3}
          className="flex-1 resize-y bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-xs pt-1.5"
          style={{ color: "var(--text-muted)" }}
          aria-label="Remove example"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 text-right text-[11px]" style={{ color: "var(--text-faint)" }}>
        {value.length}/{MAX_EXAMPLE_CHARS}
      </div>
    </div>
  );
}

function buildSummary(examples: string[], instructions: string): string {
  const exCount = examples.filter((e) => e.trim().length > 0).length;
  const hasInstr = instructions.trim().length > 0;
  const parts: string[] = [];
  if (exCount > 0) parts.push(`${exCount} example${exCount === 1 ? "" : "s"}`);
  if (hasInstr) parts.push("instructions set");
  if (parts.length === 0) return "optional";
  return parts.join(" · ");
}
