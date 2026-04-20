// POST /api/transcript
// Input: { url: string } — YouTube URL
// Output: { title, content, url, durationSeconds? } or { error }

import { NextRequest, NextResponse } from "next/server";
import { extractYouTube } from "@/lib/extract-youtube";
import { isYouTubeUrl } from "@/lib/url-utils";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export const maxDuration = 30;

const MAX_TRANSCRIPTS_PER_MIN = 10;
const MAX_TRANSCRIPTS_PER_DAY = 50;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (isRateLimited(`transcript:min:${ip}`, MAX_TRANSCRIPTS_PER_MIN, 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many transcript requests — slow down." },
      { status: 429 }
    );
  }
  if (
    isRateLimited(`transcript:day:${ip}`, MAX_TRANSCRIPTS_PER_DAY, 24 * 60 * 60 * 1000)
  ) {
    return NextResponse.json(
      { error: "Daily transcript limit reached." },
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
  if (!isYouTubeUrl(url)) {
    return NextResponse.json(
      { error: "Only YouTube URLs are supported here" },
      { status: 400 }
    );
  }

  try {
    const result = await extractYouTube(url);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcript extraction failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
