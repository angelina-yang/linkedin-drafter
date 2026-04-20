"use client";

interface Props {
  isOpen: boolean;
  message: string;
  onContact: () => void;
  onDismiss: () => void;
}

export function UpsellModal({ isOpen, message, onContact, onDismiss }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "var(--bg-backdrop)" }}
        onClick={onDismiss}
      />
      <div
        className="relative rounded-2xl w-full max-w-md mx-4 p-5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--accent)",
        }}
      >
        <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          💼 You&apos;re hitting the free-tool limits
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {message}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded px-3 py-1.5 text-xs"
            style={{
              background: "transparent",
              border: "1px solid var(--border-secondary)",
              color: "var(--text-muted)",
            }}
          >
            Keep working
          </button>
          <button
            type="button"
            onClick={onContact}
            className="rounded px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            Talk to Angelina
          </button>
        </div>
      </div>
    </div>
  );
}
