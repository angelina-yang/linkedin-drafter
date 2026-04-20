"use client";

import { useRef, useState } from "react";
import {
  FileTooLargeError,
  MAX_CONTENT_CHARS,
  MAX_FILE_BYTES,
  UnsupportedFileTypeError,
  parseFile,
} from "@/lib/parse-file";
import { isYouTubeUrl, looksLikeHttpUrl } from "@/lib/url-utils";

export interface Source {
  id: string;
  kind: "url" | "youtube" | "text" | "file";
  rawInput: string;
  title: string;
  content: string;
  status: "empty" | "extracting" | "ready" | "error";
  error?: string;
  fileName?: string;
}

export const MAX_SOURCES = 3;

export interface UpsellTrigger {
  message: string;
  subject: string;
  preFill: string;
}

interface Props {
  sources: Source[];
  onChange: (sources: Source[]) => void;
  onOverLimit: (trigger: UpsellTrigger) => void;
}

export function newEmptySource(): Source {
  return {
    id: Math.random().toString(36).slice(2, 10),
    kind: "url",
    rawInput: "",
    title: "",
    content: "",
    status: "empty",
  };
}

async function extractUrl(url: string): Promise<{ title: string; content: string }> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as { title?: string; content?: string; error?: string };
  if (!res.ok) throw new Error(data.error || `Extraction failed (${res.status})`);
  return { title: data.title ?? "Untitled", content: data.content ?? "" };
}

async function extractYouTube(url: string): Promise<{
  title: string;
  content: string;
  durationSeconds?: number;
}> {
  const res = await fetch("/api/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as {
    title?: string;
    content?: string;
    durationSeconds?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || `Transcript failed (${res.status})`);
  return {
    title: data.title ?? "YouTube video",
    content: data.content ?? "",
    durationSeconds: data.durationSeconds,
  };
}

export function SourceList({ sources, onChange, onOverLimit }: Props) {
  const addSlot = () => {
    if (sources.length >= MAX_SOURCES) {
      onOverLimit({
        message: `${MAX_SOURCES} is our sweet spot for clean synthesis. Need to weave more sources into one post? We build custom multi-source workflows for content teams and agencies.`,
        subject: "Multi-source workflow",
        preFill:
          "Hi Angelina — I'd love to synthesize more than 3 sources at a time. Could you tell me about custom workflows?",
      });
      return;
    }
    onChange([...sources, newEmptySource()]);
  };

  const updateSource = (id: string, patch: Partial<Source>) => {
    onChange(sources.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSource = (id: string) => {
    const next = sources.filter((s) => s.id !== id);
    onChange(next.length === 0 ? [newEmptySource()] : next);
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
          📥 Sources <span style={{ color: "var(--text-faint)" }}>({sources.length}/{MAX_SOURCES})</span>
        </h2>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          URL · YouTube · paste · file
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {sources.map((source, idx) => (
          <SourceRow
            key={source.id}
            index={idx}
            source={source}
            onUpdate={(patch) => updateSource(source.id, patch)}
            onRemove={() => removeSource(source.id)}
            onOverLimit={onOverLimit}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addSlot}
        className="mt-3 w-full rounded border-2 border-dashed py-2 text-xs transition-colors"
        style={{
          borderColor: "var(--border-secondary)",
          color: "var(--text-muted)",
        }}
      >
        + Add source
      </button>
    </section>
  );
}

interface RowProps {
  index: number;
  source: Source;
  onUpdate: (patch: Partial<Source>) => void;
  onRemove: () => void;
  onOverLimit: (trigger: UpsellTrigger) => void;
}

function SourceRow({ index, source, onUpdate, onRemove, onOverLimit }: RowProps) {
  const [localInput, setLocalInput] = useState(source.rawInput);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextBlur = async () => {
    const raw = localInput.trim();
    if (!raw) {
      onUpdate({ rawInput: "", status: "empty", title: "", content: "", error: undefined });
      return;
    }

    if (looksLikeHttpUrl(raw)) {
      if (isYouTubeUrl(raw)) {
        onUpdate({ rawInput: raw, kind: "youtube", status: "extracting", error: undefined });
        try {
          const { title, content, durationSeconds } = await extractYouTube(raw);
          onUpdate({ title, content, status: "ready" });
          if (durationSeconds && durationSeconds > 60 * 60) {
            onOverLimit({
              message: `"${title}" is ${Math.round(durationSeconds / 60)} minutes long. We extracted what we can, but long-form video is a better fit for our custom workflows. Repurposing a whole catalog? We can build something tailored.`,
              subject: "Long-form video repurposing",
              preFill: `Hi Angelina — I'd like to repurpose longer-form video content into LinkedIn posts. The one I tried was "${title}" (${Math.round(durationSeconds / 60)} min). Can you tell me about custom workflows?`,
            });
          }
        } catch (err) {
          onUpdate({ status: "error", error: err instanceof Error ? err.message : "Transcript failed" });
        }
        return;
      }
      onUpdate({ rawInput: raw, kind: "url", status: "extracting", error: undefined });
      try {
        const { title, content } = await extractUrl(raw);
        onUpdate({ title, content, status: "ready" });
      } catch (err) {
        onUpdate({ status: "error", error: err instanceof Error ? err.message : "Extraction failed" });
      }
      return;
    }

    // Plain text paste.
    const wasTruncated = raw.length > MAX_CONTENT_CHARS;
    const text = wasTruncated ? raw.slice(0, MAX_CONTENT_CHARS) : raw;
    onUpdate({
      rawInput: text,
      kind: "text",
      title: `Pasted text ${index + 1}`,
      content: text,
      status: "ready",
      error: undefined,
    });
    if (wasTruncated) {
      onOverLimit({
        message: `That paste was over 50,000 characters — we used the first 50k. Repurposing a whole archive? We build bespoke workflows for content teams.`,
        subject: "Archive repurposing",
        preFill:
          "Hi Angelina — I have a large archive of content I'd like to repurpose into LinkedIn posts. Can you tell me about custom workflows?",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-selected after an error.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    onUpdate({ rawInput: "", kind: "file", status: "extracting", error: undefined, fileName: file.name });

    try {
      const { title, content } = await parseFile(file);
      onUpdate({ title, content, status: "ready", fileName: file.name });
    } catch (err) {
      if (err instanceof FileTooLargeError) {
        onUpdate({ status: "empty", error: undefined, fileName: undefined });
        onOverLimit({
          message: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB — larger than the free tool handles (5MB max). For bigger docs or batch workflows, we can build something tailored.`,
          subject: "Larger file support",
          preFill: `Hi Angelina — I'd like to process larger documents (my file was ${(file.size / (1024 * 1024)).toFixed(1)}MB). Can you tell me about custom workflows for bigger files?`,
        });
        return;
      }
      if (err instanceof UnsupportedFileTypeError) {
        onUpdate({ status: "error", error: err.message, fileName: undefined });
        return;
      }
      onUpdate({
        status: "error",
        error: err instanceof Error ? err.message : "Could not read file",
        fileName: undefined,
      });
    }
  };

  return (
    <div
      className="rounded-md p-3"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium pt-2" style={{ color: "var(--text-faint)" }}>
          {index + 1}.
        </span>
        <div className="flex-1">
          {source.status === "ready" ? (
            <SourceReadyCard source={source} />
          ) : (
            <>
              <textarea
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onBlur={() => void handleTextBlur()}
                placeholder="Paste a URL, YouTube link, article, or notes..."
                rows={2}
                className="w-full resize-none bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              <div className="mt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  📎 Upload .pdf / .txt / .md
                </button>
                <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                  {(MAX_FILE_BYTES / (1024 * 1024)).toFixed(0)}MB max
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
                onChange={(e) => void handleFileChange(e)}
                className="hidden"
              />
            </>
          )}
          {source.status === "extracting" && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {source.kind === "youtube" ? "Fetching transcript…" : source.kind === "file" ? "Reading file…" : "Extracting…"}
            </p>
          )}
          {source.status === "error" && source.error && (
            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
              {source.error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setLocalInput("");
            onRemove();
          }}
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
          aria-label="Remove source"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function SourceReadyCard({ source }: { source: Source }) {
  const charCount = source.content.length;
  const icon =
    source.kind === "url"
      ? "🔗"
      : source.kind === "youtube"
        ? "▶️"
        : source.kind === "file"
          ? "📎"
          : "📝";
  const label = source.fileName ?? source.title;
  return (
    <div>
      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
        {icon} {charCount.toLocaleString()} chars
      </p>
    </div>
  );
}
