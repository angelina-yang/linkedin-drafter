// Single source of truth for all localStorage I/O. Keys are namespaced with
// `tlin:` so multiple Lab tools on the same origin don't collide.

import type { CtaId, FormatId } from "./archetypes";

const KEY = {
  schemaVersion: "tlin:schemaVersion",
  registered: "tlin:registered",
  apiKey: "tlin:apiKey",
  goal: "tlin:goal",
  format: "tlin:format",
  cta: "tlin:cta",
  customCta: "tlin:customCta",
  model: "tlin:model",
  examples: "tlin:examples",
  instructions: "tlin:instructions",
  sessionCost: "tlin:sessionCost",
} as const;

export const SCHEMA_VERSION = 1;

export type ModelChoice = "quick" | "polished";
export type CtaChoice = CtaId | "custom";

export interface RegisteredIdentity {
  name: string;
  email: string;
  newsletterOptIn: boolean;
  timestamp: number;
}

function safeGet(key: string): string | null {
  try {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // localStorage can throw (quota, disabled) — drop silently.
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  } catch {
    // noop
  }
}

function readJSON<T>(key: string): T | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  safeSet(key, JSON.stringify(value));
}

// --- Identity -------------------------------------------------------------

export function readIdentity(): RegisteredIdentity | null {
  return readJSON<RegisteredIdentity>(KEY.registered);
}

export function writeIdentity(identity: RegisteredIdentity): void {
  writeJSON(KEY.registered, identity);
  safeSet(KEY.schemaVersion, String(SCHEMA_VERSION));
}

export function clearIdentity(): void {
  safeRemove(KEY.registered);
}

// --- API key --------------------------------------------------------------

export function readApiKey(): string | null {
  return safeGet(KEY.apiKey);
}

export function writeApiKey(key: string): void {
  safeSet(KEY.apiKey, key.trim());
}

export function clearApiKey(): void {
  safeRemove(KEY.apiKey);
}

// --- Goal (free-text identity + purpose) ----------------------------------

export function readGoal(): string {
  return safeGet(KEY.goal) ?? "";
}

export function writeGoal(text: string): void {
  safeSet(KEY.goal, text);
}

// --- Format ---------------------------------------------------------------

export function readFormat(): FormatId | null {
  const raw = safeGet(KEY.format);
  return raw as FormatId | null;
}

export function writeFormat(format: FormatId): void {
  safeSet(KEY.format, format);
}

// --- CTA ------------------------------------------------------------------

export function readCta(): CtaChoice {
  return (safeGet(KEY.cta) as CtaChoice | null) ?? "comments";
}

export function writeCta(cta: CtaChoice): void {
  safeSet(KEY.cta, cta);
}

export function readCustomCta(): string {
  return safeGet(KEY.customCta) ?? "";
}

export function writeCustomCta(text: string): void {
  safeSet(KEY.customCta, text);
}

// --- Model ----------------------------------------------------------------

export function readModel(): ModelChoice {
  return (safeGet(KEY.model) as ModelChoice | null) ?? "polished";
}

export function writeModel(model: ModelChoice): void {
  safeSet(KEY.model, model);
}

// --- Examples + instructions (Stage 2) ------------------------------------

export function readExamples(): string[] {
  return readJSON<string[]>(KEY.examples) ?? [];
}

export function writeExamples(examples: string[]): void {
  writeJSON(KEY.examples, examples);
}

export function readInstructions(): string {
  return safeGet(KEY.instructions) ?? "";
}

export function writeInstructions(text: string): void {
  safeSet(KEY.instructions, text);
}

// --- Session cost ---------------------------------------------------------

export function readSessionCost(): number {
  const raw = safeGet(KEY.sessionCost);
  const n = raw === null ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function writeSessionCost(cost: number): void {
  safeSet(KEY.sessionCost, String(cost));
}

export function resetSessionCost(): void {
  safeSet(KEY.sessionCost, "0");
}
