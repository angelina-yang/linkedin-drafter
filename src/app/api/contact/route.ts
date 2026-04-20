// POST /api/contact
// Consulting / feature-request / upsell inbound. Writes to the shared signup
// webhook tagged `source: "tlin-contact"` — same destination as /api/register.

import { NextRequest, NextResponse } from "next/server";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export const maxDuration = 15;

const MAX_SUBMISSIONS_PER_HOUR = 3;
const MAX_SUBJECT_CHARS = 200;
const MAX_MESSAGE_CHARS = 5_000;
const MAX_EMAIL_CHARS = 320;
const MAX_CONTEXT_CHARS = 1_000;

interface Body {
  subject?: unknown;
  message?: unknown;
  replyTo?: unknown;
  context?: unknown;
  honeypot?: unknown;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (isRateLimited(`contact:${ip}`, MAX_SUBMISSIONS_PER_HOUR, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many submissions this hour. Please try again later." },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot check — silently drop bots that fill hidden field.
  // Return 200 so the bot doesn't learn the field is a trap.
  if (typeof body.honeypot === "string" && body.honeypot.trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  const subject =
    typeof body.subject === "string" ? body.subject.slice(0, MAX_SUBJECT_CHARS) : "";
  const message =
    typeof body.message === "string" ? body.message.slice(0, MAX_MESSAGE_CHARS) : "";
  const replyTo =
    typeof body.replyTo === "string" ? body.replyTo.slice(0, MAX_EMAIL_CHARS) : "";
  const context =
    typeof body.context === "string" ? body.context.slice(0, MAX_CONTEXT_CHARS) : "";

  if (!subject.trim() || !message.trim()) {
    return NextResponse.json(
      { error: "Subject and message are required." },
      { status: 400 }
    );
  }
  if (message.trim().length < 10) {
    return NextResponse.json(
      { error: "Please add a few more words so we can help." },
      { status: 400 }
    );
  }

  const sheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK;
  if (sheetWebhook) {
    try {
      const res = await fetch(sheetWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: replyTo || "(anonymous)",
          email: replyTo,
          subject,
          message,
          context,
          source: "tlin-contact",
        }),
        redirect: "manual",
      });
      if (res.status === 301 || res.status === 302) {
        const location = res.headers.get("location");
        if (location) await fetch(location);
      }
    } catch {
      // Logging failure should not block the user — they still see success.
    }
  }

  // Intentional: the signup webhook is the single source of truth for all Lab
  // tool inbound (signups + contact + feature requests). Filterable, sortable,
  // one inbox across all apps. Email relay was considered and rejected — adds
  // noise without adding signal.

  return NextResponse.json({ success: true });
}
