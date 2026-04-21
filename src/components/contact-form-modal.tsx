"use client";

import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  subject: string;
  initialMessage?: string;
  userEmail?: string;
  context?: string;
  onClose: () => void;
}

const MESSAGE_MAX = 5000;

export function ContactFormModal({
  isOpen,
  subject: initialSubject,
  initialMessage,
  userEmail,
  context,
  onClose,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setMessage(initialMessage ?? "");
      setHoneypot("");
      setError(null);
      setDone(false);
      setSubmitting(false);
    }
  }, [isOpen, initialSubject, initialMessage]);

  if (!isOpen) return null;

  const canSubmit =
    subject.trim().length > 0 && message.trim().length >= 10 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          // Auto-attach the user's registered email so every submission is
          // reply-able. No visible field — the email is already in our system
          // from the welcome-modal signup; this just stamps it on the message
          // so Angelina knows who sent what.
          replyTo: userEmail?.trim() || undefined,
          context,
          honeypot,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      {/* Backdrop — dismissible for contact form (not a Terms gate). */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "var(--bg-backdrop)" }}
        onClick={onClose}
      />
      <div
        className="relative rounded-2xl w-full max-w-md mx-4 p-5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-secondary)",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            {done ? "Message sent" : "Talk to Angelina"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-lg"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Got it. Angelina will reply at the email you registered with
              {userEmail ? (
                <>
                  {" "}(<span style={{ color: "var(--text-primary)" }}>{userEmail}</span>)
                </>
              ) : null}
              .
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 200))}
                className="w-full rounded px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-secondary)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                rows={6}
                placeholder="Tell us what you need, what you're working on, or what's missing."
                className="w-full rounded px-3 py-2 text-sm resize-y focus:outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-secondary)",
                  color: "var(--text-primary)",
                }}
              />
              <div className="mt-1 text-right text-[11px]" style={{ color: "var(--text-faint)" }}>
                {message.length}/{MESSAGE_MAX}
              </div>
            </div>

            {/* Honeypot — hidden from users, bots fill it and get silently dropped. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-10000px",
                top: "auto",
                width: 1,
                height: 1,
                overflow: "hidden",
              }}
            >
              <label>
                Leave this field empty
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            {error && (
              <p className="text-xs" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}

            {userEmail ? (
              <p className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                We&apos;ll reply to the email you registered with (<span style={{ color: "var(--text-muted)" }}>{userEmail}</span>).
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg py-2 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              {submitting ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
