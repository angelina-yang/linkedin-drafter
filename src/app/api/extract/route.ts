// POST /api/extract
// Input: { url: string }
// Output: { title, content, url } or { error }

import { NextRequest, NextResponse } from "next/server";
import { extractArticle } from "@/lib/extract-article";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";
import { SsrfError } from "@/lib/ssrf-guard";

export const maxDuration = 30;

const MAX_EXTRACTS_PER_MIN = 20;
const MAX_EXTRACTS_PER_DAY = 100;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (isRateLimited(`extract:min:${ip}`, MAX_EXTRACTS_PER_MIN, 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests — please slow down." },
      { status: 429 }
    );
  }
  if (isRateLimited(`extract:day:${ip}`, MAX_EXTRACTS_PER_DAY, 24 * 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Daily extraction limit reached." },
      { status: 429 }
    );
  }

  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url;
  if (typeof url !== "string" || url.length === 0) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const article = await extractArticle(url);
    return NextResponse.json(article);
  } catch (err) {
    if (err instanceof SsrfError) {
      return NextResponse.json(
        { error: "That URL isn't allowed." },
        { status: 400 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
