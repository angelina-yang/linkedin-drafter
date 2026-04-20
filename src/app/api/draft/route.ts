// POST /api/draft
// Input: { sources, goal, format, cta, customCta?, examples?, instructions?, model, variantCount? }
// Header: x-claude-api-key (BYOK — required, no server fallback per LAB_PRINCIPLES Rule 11)
// Output: { variants: string[], usage: { inputTokens, outputTokens, estimatedCostUsd } }

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildDraftPrompt, splitVariants, type DraftSource, type CtaInput } from "@/lib/prompts";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import type { CtaId, FormatId } from "@/lib/archetypes";

export const maxDuration = 60;

const MAX_GENERATIONS_PER_HOUR = 20;
const MAX_SOURCES = 3;
const MAX_SOURCE_CHARS = 50_000;
const MAX_GOAL_CHARS = 500;
const MAX_CUSTOM_CTA_CHARS = 300;
const MAX_INSTRUCTIONS_CHARS = 2_000;
const MAX_EXAMPLE_CHARS = 3_000;
const MAX_EXAMPLES = 5;

const MODEL_QUICK = "claude-haiku-4-5-20251001";
const MODEL_POLISHED = "claude-sonnet-4-6";

const COST_PER_MTOK: Record<string, { input: number; output: number }> = {
  [MODEL_QUICK]: { input: 1.0, output: 5.0 },
  [MODEL_POLISHED]: { input: 3.0, output: 15.0 },
};

interface DraftRequestBody {
  sources?: unknown;
  goal?: unknown;
  format?: unknown;
  cta?: unknown;
  customCta?: unknown;
  examples?: unknown;
  instructions?: unknown;
  model?: unknown;
  variantCount?: unknown;
}

function isValidFormat(v: unknown): v is FormatId {
  return (
    v === "story" ||
    v === "contrarian" ||
    v === "framework" ||
    v === "build-in-public" ||
    v === "question"
  );
}

function isValidCta(v: unknown): v is CtaId | "custom" {
  return (
    v === "none" ||
    v === "comments" ||
    v === "link" ||
    v === "soft-sell" ||
    v === "connect" ||
    v === "custom"
  );
}

function parseSources(raw: unknown): DraftSource[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0 || raw.length > MAX_SOURCES) return null;
  const out: DraftSource[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const rec = item as { title?: unknown; content?: unknown };
    const title = typeof rec.title === "string" ? rec.title.slice(0, 500) : "";
    const content = typeof rec.content === "string" ? rec.content : "";
    if (!content || content.length < 50) return null;
    out.push({
      title: title || "Untitled",
      content: content.slice(0, MAX_SOURCE_CHARS),
    });
  }
  return out;
}

function parseExamples(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.slice(0, MAX_EXAMPLE_CHARS))
    .filter((e) => e.trim().length > 0)
    .slice(0, MAX_EXAMPLES);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (isRateLimited(`draft:${ip}`, MAX_GENERATIONS_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many generations this hour. Please slow down." },
      { status: 429 }
    );
  }

  const apiKey = req.headers.get("x-claude-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key required. Paste it in the settings panel." },
      { status: 401 }
    );
  }

  let body: DraftRequestBody;
  try {
    body = (await req.json()) as DraftRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sources = parseSources(body.sources);
  if (!sources) {
    return NextResponse.json(
      { error: `Provide 1-${MAX_SOURCES} sources, each with at least 50 chars of content.` },
      { status: 400 }
    );
  }
  if (!isValidFormat(body.format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }
  if (!isValidCta(body.cta)) {
    return NextResponse.json({ error: "Invalid CTA" }, { status: 400 });
  }

  const goal =
    typeof body.goal === "string" ? body.goal.slice(0, MAX_GOAL_CHARS) : "";
  const customCta =
    typeof body.customCta === "string"
      ? body.customCta.slice(0, MAX_CUSTOM_CTA_CHARS)
      : undefined;
  const instructions =
    typeof body.instructions === "string"
      ? body.instructions.slice(0, MAX_INSTRUCTIONS_CHARS)
      : undefined;
  const examples = parseExamples(body.examples);

  const rawVariantCount =
    typeof body.variantCount === "number" ? body.variantCount : 2;
  const variantCount = Math.max(1, Math.min(3, Math.floor(rawVariantCount)));

  const modelChoice = body.model === "quick" ? "quick" : "polished";
  const model = modelChoice === "quick" ? MODEL_QUICK : MODEL_POLISHED;

  const cta: CtaInput = body.cta;

  const { system, userMessage } = buildDraftPrompt({
    sources,
    goal,
    format: body.format,
    cta,
    customCta,
    examples,
    instructions,
    variantCount,
  });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const variants = splitVariants(textBlock.text, variantCount);

    const rates = COST_PER_MTOK[model] ?? COST_PER_MTOK[MODEL_POLISHED];
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output;

    return NextResponse.json({
      variants,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
      model,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Draft generation failed";
    return NextResponse.json(
      { error: sanitizeProviderError(message) },
      { status: 502 }
    );
  }
}

function sanitizeProviderError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("authentication") || lower.includes("unauthorized") || lower.includes("invalid x-api-key") || lower.includes("invalid api key")) {
    return "Your Anthropic API key was rejected. Double-check it in the settings panel.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "Anthropic rate-limited your request. Wait a moment and try again.";
  }
  if (lower.includes("overloaded")) {
    return "Anthropic is temporarily overloaded. Try again in a few seconds.";
  }
  return "Draft generation failed. Try again or try the Quick model.";
}
