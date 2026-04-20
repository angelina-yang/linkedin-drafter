"use client";

import {
  CTA_PRESETS,
  FORMAT_PRESETS,
  GOAL_HINTS,
  type CtaId,
  type FormatId,
} from "@/lib/archetypes";

type CtaChoice = CtaId | "custom";

interface Props {
  goal: string;
  format: FormatId;
  cta: CtaChoice;
  customCta: string;
  onGoalChange: (text: string) => void;
  onFormatChange: (format: FormatId) => void;
  onCtaChange: (cta: CtaChoice) => void;
  onCustomCtaChange: (text: string) => void;
}

const GOAL_MAX_CHARS = 500;
const CUSTOM_CTA_MAX_CHARS = 300;

export function VoicePanel({
  goal,
  format,
  cta,
  customCta,
  onGoalChange,
  onFormatChange,
  onCtaChange,
  onCustomCtaChange,
}: Props) {
  return (
    <section
      className="rounded-lg p-4 space-y-5"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <GoalField goal={goal} onChange={onGoalChange} />
      <FormatField format={format} onChange={onFormatChange} />
      <CtaField
        cta={cta}
        customCta={customCta}
        onCtaChange={onCtaChange}
        onCustomCtaChange={onCustomCtaChange}
      />
    </section>
  );
}

function GoalField({ goal, onChange }: { goal: string; onChange: (t: string) => void }) {
  const showHints = goal.trim().length === 0;
  return (
    <div>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        🎯 Your goal
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        Who you are and what you&apos;re building toward. This tunes the voice and the stakes.
      </p>

      {showHints && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>
            Need a starting point? Click to use.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_HINTS.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => onChange(hint)}
                className="rounded-full px-2.5 py-1 text-[11px] transition-colors text-left"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-secondary)",
                  color: "var(--text-muted)",
                }}
                title={hint}
              >
                {truncate(hint, 60)}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={goal}
        onChange={(e) => onChange(e.target.value.slice(0, GOAL_MAX_CHARS))}
        placeholder="e.g., I'm a founder building thought leadership in AI product strategy."
        rows={3}
        className="mt-2 w-full rounded px-3 py-2 text-sm focus:outline-none"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-secondary)",
          color: "var(--text-primary)",
        }}
      />
      <div className="mt-1 text-right text-[11px]" style={{ color: "var(--text-faint)" }}>
        {goal.length}/{GOAL_MAX_CHARS}
      </div>
    </div>
  );
}

function FormatField({
  format,
  onChange,
}: {
  format: FormatId;
  onChange: (format: FormatId) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        ✂️ Format
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        How to structure the post.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FORMAT_PRESETS.map((preset) => (
          <ChipButton
            key={preset.id}
            label={preset.label}
            active={format === preset.id}
            onClick={() => onChange(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CtaField({
  cta,
  customCta,
  onCtaChange,
  onCustomCtaChange,
}: {
  cta: CtaChoice;
  customCta: string;
  onCtaChange: (cta: CtaChoice) => void;
  onCustomCtaChange: (text: string) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        📣 How to end
      </h2>
      <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        What do you want the reader to do next?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CTA_PRESETS.map((preset) => (
          <ChipButton
            key={preset.id}
            label={preset.label}
            active={cta === preset.id}
            onClick={() => onCtaChange(preset.id)}
            title={preset.tagline}
          />
        ))}
        <ChipButton
          label="Custom"
          active={cta === "custom"}
          onClick={() => onCtaChange("custom")}
          title="Describe your own ending in one line"
        />
      </div>
      {cta === "custom" && (
        <input
          type="text"
          value={customCta}
          onChange={(e) => onCustomCtaChange(e.target.value.slice(0, CUSTOM_CTA_MAX_CHARS))}
          placeholder='e.g., "Tag a founder who needs to see this."'
          className="mt-2 w-full rounded px-3 py-2 text-sm"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-secondary)",
            color: "var(--text-primary)",
          }}
        />
      )}
    </div>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}

function ChipButton({ label, active, onClick, title }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-full px-3 py-1.5 text-xs transition-colors"
      style={{
        background: active ? "var(--accent)" : "var(--bg-input)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border-secondary)"}`,
        color: active ? "white" : "var(--text-primary)",
      }}
    >
      {label}
    </button>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
