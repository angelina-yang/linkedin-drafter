// YouTube transcript extraction via Supadata. Shared across Lab tools; needs
// SUPADATA_API_KEY env var set on the server.

import { extractYouTubeVideoId } from "./url-utils";

const MAX_CONTENT_CHARS = 50_000;

export interface ExtractedYouTube {
  title: string;
  content: string;
  url: string;
  durationSeconds?: number;
}

export async function extractYouTube(url: string): Promise<ExtractedYouTube> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "YouTube support is not configured on this deployment (SUPADATA_API_KEY missing)."
    );
  }

  // oEmbed for title — free, no key, best-effort.
  let title = "YouTube video";
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (res.ok) {
      const data = (await res.json()) as { title?: string };
      if (data.title) title = data.title;
    }
  } catch {
    // non-fatal
  }

  const transcriptRes = await fetch(
    `https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!transcriptRes.ok) {
    const status = transcriptRes.status;
    if (status === 401 || status === 403) {
      throw new Error("YouTube transcript service auth failed.");
    }
    if (status === 429) {
      throw new Error("YouTube transcript quota exceeded. Try again later.");
    }
    if (status === 404) {
      throw new Error(
        `No transcript available for "${title}". This video may not have captions.`
      );
    }
    throw new Error(`Transcript service returned ${status}.`);
  }

  const data = (await transcriptRes.json()) as {
    content?: Array<{ text?: string; duration?: number; offset?: number }>;
  };
  const segments = data.content;

  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    throw new Error(
      `No transcript found for "${title}". This video may not have captions.`
    );
  }

  let content = segments
    .map((s) => (typeof s.text === "string" ? s.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!content) {
    throw new Error("Transcript was empty after extraction.");
  }

  // Approximate duration from the last segment's offset+duration in ms.
  const last = segments[segments.length - 1];
  const durationSeconds =
    typeof last?.offset === "number" && typeof last?.duration === "number"
      ? Math.round((last.offset + last.duration) / 1000)
      : undefined;

  if (content.length > MAX_CONTENT_CHARS) {
    content = content.slice(0, MAX_CONTENT_CHARS);
  }

  return { title, content, url, durationSeconds };
}
