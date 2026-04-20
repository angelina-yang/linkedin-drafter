"use client";

import { useEffect, useState } from "react";
import { WelcomeModal } from "./welcome-modal";
import { ApiKeyPanel } from "./api-key-panel";
import { SourceList, newEmptySource, type Source } from "./source-list";
import { VoicePanel } from "./voice-panel";
import { MakeItYours } from "./make-it-yours";
import { ModelToggle } from "./model-toggle";
import { VariantTabs } from "./variant-tabs";
import { UpsellModal } from "./upsell-modal";
import { ContactFormModal } from "./contact-form-modal";
import type { UpsellTrigger } from "./source-list";
import type { FormatId } from "@/lib/archetypes";
import { replaceHook } from "@/lib/prompts";
import {
  readCta,
  readCustomCta,
  readExamples,
  readFormat,
  readGoal,
  readIdentity,
  readInstructions,
  readModel,
  readSessionCost,
  writeCta,
  writeCustomCta,
  writeExamples,
  writeFormat,
  writeGoal,
  writeIdentity,
  writeInstructions,
  writeModel,
  writeSessionCost,
  type CtaChoice,
  type ModelChoice,
  type RegisteredIdentity,
} from "@/lib/storage";

interface DraftApiResponse {
  variants?: string[];
  usage?: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  model?: string;
  error?: string;
}

export function Workspace() {
  // `undefined` = hydration not finished yet — avoids flashing the welcome modal.
  const [identity, setIdentity] = useState<RegisteredIdentity | null | undefined>(undefined);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [sources, setSources] = useState<Source[]>(() => [newEmptySource()]);
  const [goal, setGoal] = useState("");
  const [format, setFormat] = useState<FormatId>("story");
  const [cta, setCta] = useState<CtaChoice>("comments");
  const [customCta, setCustomCta] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState<ModelChoice>("polished");

  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<{ cost: number } | null>(null);
  const [sessionCost, setSessionCost] = useState(0);
  const [upsellTrigger, setUpsellTrigger] = useState<UpsellTrigger | null>(null);
  const [contactForm, setContactForm] = useState<{
    subject: string;
    initialMessage?: string;
    context?: string;
  } | null>(null);

  useEffect(() => {
    setIdentity(readIdentity());
    setGoal(readGoal());
    const savedFormat = readFormat();
    if (savedFormat) setFormat(savedFormat);
    setCta(readCta());
    setCustomCta(readCustomCta());
    setExamples(readExamples());
    setInstructions(readInstructions());
    setModel(readModel());
    setSessionCost(readSessionCost());
  }, []);

  const handleRegistered = (name: string, email: string) => {
    const record: RegisteredIdentity = {
      name,
      email,
      newsletterOptIn: false,
      timestamp: Date.now(),
    };
    writeIdentity(record);
    setIdentity(record);
  };

  const handleGoalChange = (text: string) => {
    setGoal(text);
    writeGoal(text);
  };

  const handleFormatChange = (next: FormatId) => {
    setFormat(next);
    writeFormat(next);
  };

  const handleCtaChange = (next: CtaChoice) => {
    setCta(next);
    writeCta(next);
  };

  const handleCustomCtaChange = (text: string) => {
    setCustomCta(text);
    writeCustomCta(text);
  };

  const handleExamplesChange = (next: string[]) => {
    setExamples(next);
    writeExamples(next);
  };

  const handleInstructionsChange = (text: string) => {
    setInstructions(text);
    writeInstructions(text);
  };

  const handleModelChange = (next: ModelChoice) => {
    setModel(next);
    writeModel(next);
  };

  const handleVariantEdit = (index: number, text: string) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? text : v)));
  };

  const addCostToSession = (cost: number) => {
    setLastUsage({ cost });
    const newTotal = sessionCost + cost;
    setSessionCost(newTotal);
    writeSessionCost(newTotal);
  };

  const handleRegenHook = async (index: number): Promise<string | null> => {
    if (!apiKey) return "Anthropic API key required.";
    const current = variants[index];
    if (!current || current.trim().length < 20) return "Nothing to regenerate.";

    try {
      const res = await fetch("/api/regen-hook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-claude-api-key": apiKey,
        },
        body: JSON.stringify({
          currentPost: current,
          goal,
          format,
          examples: examples.filter((e) => e.trim().length > 0),
          instructions: instructions.trim() || undefined,
          model,
        }),
      });
      const data = (await res.json()) as {
        hook?: string;
        usage?: { estimatedCostUsd: number };
        error?: string;
      };
      if (!res.ok || !data.hook) {
        return data.error || `Hook regen failed (${res.status})`;
      }
      setVariants((prev) =>
        prev.map((v, i) => (i === index ? replaceHook(v, data.hook!) : v))
      );
      if (data.usage) addCostToSession(data.usage.estimatedCostUsd);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Hook regen failed";
    }
  };

  const handleRegenFull = async (index: number): Promise<string | null> => {
    if (!apiKey) return "Anthropic API key required.";
    const readySources = sources
      .filter((s) => s.status === "ready")
      .map((s) => ({ title: s.title, content: s.content }));
    if (readySources.length === 0) return "Need at least one source.";

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-claude-api-key": apiKey,
        },
        body: JSON.stringify({
          sources: readySources,
          goal,
          format,
          cta,
          customCta: cta === "custom" ? customCta : undefined,
          examples: examples.filter((e) => e.trim().length > 0),
          instructions: instructions.trim() || undefined,
          model,
          variantCount: 1,
        }),
      });
      const data = (await res.json()) as {
        variants?: string[];
        usage?: { estimatedCostUsd: number };
        error?: string;
      };
      if (!res.ok || !data.variants || data.variants.length === 0) {
        return data.error || `Regen failed (${res.status})`;
      }
      setVariants((prev) =>
        prev.map((v, i) => (i === index ? data.variants![0] : v))
      );
      if (data.usage) addCostToSession(data.usage.estimatedCostUsd);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Regen failed";
    }
  };

  const readyCount = sources.filter((s) => s.status === "ready").length;
  const canGenerate =
    Boolean(apiKey) &&
    readyCount >= 1 &&
    (cta !== "custom" || customCta.trim().length > 0) &&
    !generating;

  const handleGenerate = async () => {
    if (!canGenerate || !apiKey) return;
    setGenerating(true);
    setError(null);

    const readySources = sources
      .filter((s) => s.status === "ready")
      .map((s) => ({ title: s.title, content: s.content }));

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-claude-api-key": apiKey,
        },
        body: JSON.stringify({
          sources: readySources,
          goal,
          format,
          cta,
          customCta: cta === "custom" ? customCta : undefined,
          examples: examples.filter((e) => e.trim().length > 0),
          instructions: instructions.trim() || undefined,
          model,
          variantCount: 2,
        }),
      });
      const data = (await res.json()) as DraftApiResponse;
      if (!res.ok || !data.variants) {
        throw new Error(data.error || `Draft failed (${res.status})`);
      }
      setVariants(data.variants);
      if (data.usage) addCostToSession(data.usage.estimatedCostUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setGenerating(false);
    }
  };

  // Rough per-action cost hints, shown inline on the regen buttons.
  const regenHookCost = model === "quick" ? "~$0.001" : "~$0.003";
  const regenFullCost = model === "quick" ? "~$0.003" : "~$0.008";

  if (identity === undefined) {
    return null;
  }

  return (
    <>
      <WelcomeModal isOpen={identity === null} onComplete={handleRegistered} />

      {identity && (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold">TL;IN</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Turn articles, videos, and notes into LinkedIn posts that sound like you.
            </p>
          </header>

          <ApiKeyPanel onChange={setApiKey} />

          <SourceList
            sources={sources}
            onChange={setSources}
            onOverLimit={(trigger) => setUpsellTrigger(trigger)}
          />

          <VoicePanel
            goal={goal}
            format={format}
            cta={cta}
            customCta={customCta}
            onGoalChange={handleGoalChange}
            onFormatChange={handleFormatChange}
            onCtaChange={handleCtaChange}
            onCustomCtaChange={handleCustomCtaChange}
          />

          <MakeItYours
            examples={examples}
            instructions={instructions}
            onExamplesChange={handleExamplesChange}
            onInstructionsChange={handleInstructionsChange}
          />

          <section
            className="rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <div className="flex items-center gap-3">
              <ModelToggle model={model} onChange={handleModelChange} />
              {lastUsage && (
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                  Last generation: ${lastUsage.cost.toFixed(4)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              {generating ? "Drafting…" : `Generate ${readyCount > 1 ? "synthesis" : "post"}`}
            </button>
          </section>

          {error && (
            <p
              className="rounded border px-4 py-3 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
              }}
            >
              {error}
            </p>
          )}

          {variants.length > 0 && (
            <VariantTabs
              variants={variants}
              regenHookCost={regenHookCost}
              regenFullCost={regenFullCost}
              onEdit={handleVariantEdit}
              onRegenHook={handleRegenHook}
              onRegenFull={handleRegenFull}
            />
          )}

          <footer
            className="flex flex-wrap items-center justify-between gap-3 text-xs pt-4"
            style={{
              borderTop: "1px solid var(--border-primary)",
              color: "var(--text-faint)",
            }}
          >
            <span>Session spend: ${sessionCost.toFixed(4)} (your key)</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  setContactForm({
                    subject: "Feature request",
                    initialMessage: "",
                    context: `role_goal=${goal ? "set" : "empty"} · format=${format} · cta=${cta} · sources=${readyCount}`,
                  })
                }
                className="underline"
              >
                Request a feature
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionCost(0);
                  writeSessionCost(0);
                }}
                className="underline"
              >
                Reset spend
              </button>
            </div>
          </footer>

          <UpsellModal
            isOpen={upsellTrigger !== null}
            message={upsellTrigger?.message ?? ""}
            onDismiss={() => setUpsellTrigger(null)}
            onContact={() => {
              if (!upsellTrigger) return;
              const trigger = upsellTrigger;
              setUpsellTrigger(null);
              setContactForm({
                subject: trigger.subject,
                initialMessage: trigger.preFill,
                context: `role_goal=${goal ? "set" : "empty"} · format=${format} · cta=${cta} · sources=${readyCount} · trigger=${trigger.subject}`,
              });
            }}
          />

          <ContactFormModal
            isOpen={contactForm !== null}
            subject={contactForm?.subject ?? ""}
            initialMessage={contactForm?.initialMessage}
            userEmail={identity?.email}
            context={contactForm?.context}
            onClose={() => setContactForm(null)}
          />
        </div>
      )}
    </>
  );
}
