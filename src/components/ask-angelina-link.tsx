"use client";

/**
 * A small "Ask Angelina →" link for use inside error banners and similar
 * peak-frustration moments. Prefills Delphi with the actual error context
 * so Angelina sees the symptom + app name + error message — way more
 * useful than a generic "I have a problem" support ticket.
 *
 * Usage:
 *   <AskAngelinaLink
 *     appName="Daily Brew"
 *     context="Digest generation failed"
 *     error={errorMessage}
 *   />
 */

const DELPHI_URL = "https://www.delphi.ai/angelina-yang";

interface AskAngelinaLinkProps {
  appName: string;
  /** Short label for what was happening when it broke (e.g., "Digest generation failed"). */
  context: string;
  /** Optional raw error string to include for triage. */
  error?: string;
  className?: string;
}

export function AskAngelinaLink({ appName, context, error, className = "" }: AskAngelinaLinkProps) {
  const lines = [
    `I'm getting an error in ${appName}.`,
    `What I was doing: ${context}`,
  ];
  if (error) lines.push(`Error: ${error}`);
  lines.push("Help?");

  const url = `${DELPHI_URL}?message=${encodeURIComponent(lines.join("\n"))}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs transition-colors hover:underline ${className}`}
      style={{ color: "var(--accent)" }}
      title="Open a chat with Angelina's Delphi about this error"
    >
      Ask Angelina <span aria-hidden="true">→</span>
    </a>
  );
}
