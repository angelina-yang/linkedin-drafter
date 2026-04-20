// POST /api/regen-hook
// Input: { currentPost, goal, format, examples?, instructions?, model }
// Header: x-claude-api-key (BYOK — required)
// Output: { hook: string, usage }

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildHookRegenPrompt } from "@/lib/prompts";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import type { FormatId } from "@/lib/archetypes";

export const maxDuration = 30;

const MAX_REGENS_PER_HOUR = 60;
const MAX_POST_CHARS = 4000;
const MAX_GOAL_CHARS = 500;
const MAX_INSTRUCTIONS_CHARS = 2000;
const MAX_EXAMPLE_CHARS = 3000;
const MAX_EXAMPLES = 5;

const MODEL_QUICK = "claude-haiku-4-5-20251001";
const MODEL_POLISHED = "claude-sonnet-4-6";

const COST_PER_MTOK: Record<string, { input: number; output: number }> = {
  [MODEL_QUICK]: { input: 1.0, output: 5.0 },
  [MODEL_POLISHED]: { input: 3.0, output: 15.0 },
};

interface Body {
  currentPost?: unknown;
  goal?: unknown;
  format?: unknown;
  examples?: unknown;
  instructions?: unknown;
  model?: unknown;
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

function parseExamples(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.slice(0, MAX_EXAMPLE_CHARS))
    .filter((e) => e.trim().length > 0)
    .slice(0, MAX_EXAMPLES);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (isRateLimited(`regen-hook:${ip}`, MAX_REGENS_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many hook regens this hour. Please slow down." },
      { status: 429 }
    );
  }

  const apiKey = req.headers.get("x-claude-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key required." },
      { status: 401 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currentPost =
    typeof body.currentPost === "string" ? body.currentPost.slice(0, MAX_POST_CHARS) : "";
  if (currentPost.length < 20) {
    return NextResponse.json(
      { error: "Need an existing draft to regenerate the hook for." },
      { status: 400 }
    );
  }
  if (!isValidFormat(body.format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const goal =
    typeof body.goal === "string" ? body.goal.slice(0, MAX_GOAL_CHARS) : "";
  const instructions =
    typeof body.instructions === "string"
      ? body.instructions.slice(0, MAX_INSTRUCTIONS_CHARS)
      : undefined;
  const examples = parseExamples(body.examples);

  const modelChoice = body.model === "quick" ? "quick" : "polished";
  const model = modelChoice === "quick" ? MODEL_QUICK : MODEL_POLISHED;

  const { system, userMessage } = buildHookRegenPrompt({
    currentPost,
    goal,
    format: body.format,
    examples,
    instructions,
  });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 300,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const hook = textBlock.text.trim();

    const rates = COST_PER_MTOK[model] ?? COST_PER_MTOK[MODEL_POLISHED];
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output;

    return NextResponse.json({
      hook,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
      model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hook regen failed";
    return NextResponse.json(
      { error: sanitizeProviderError(message) },
      { status: 502 }
    );
  }
}

function sanitizeProviderError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("authentication") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid x-api-key") ||
    lower.includes("invalid api key")
  ) {
    return "Your Anthropic API key was rejected.";
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return "Anthropic rate-limited your request. Wait a moment and try again.";
  }
  if (lower.includes("overloaded")) {
    return "Anthropic is temporarily overloaded. Try again in a few seconds.";
  }
  return "Hook regen failed. Try again.";
}
