// Server-side URL → plain text extraction.
// SSRF guard runs before the fetch. Sanitization strips tags/entities/js payloads
// before we hand content back to the client.

import { extract } from "@extractus/article-extractor";
import { validateExternalUrl } from "./ssrf-guard";

export interface ExtractedArticle {
  title: string;
  content: string;
  url: string;
}

const MAX_CONTENT_CHARS = 50_000;

function sanitizeText(input: string): string {
  let text = input.replace(/<[^>]*>/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  text = text.replace(/javascript:/gi, "");
  text = text.replace(/on\w+\s*=/gi, "");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > MAX_CONTENT_CHARS) text = text.slice(0, MAX_CONTENT_CHARS);
  return text;
}

export async function extractArticle(rawUrl: string): Promise<ExtractedArticle> {
  const url = await validateExternalUrl(rawUrl);

  // article-extractor runs its own fetch internally. Pass through timeout via
  // AbortSignal on the host so slow pages don't hang our function.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let article;
  try {
    article = await extract(url.href, {}, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "unknown";
    throw new Error(`Could not fetch or parse article: ${message}`);
  }
  clearTimeout(timer);

  if (!article || !article.content) {
    throw new Error("No readable content found at that URL");
  }

  const title = sanitizeText(article.title || "Untitled");
  const content = sanitizeText(article.content);

  if (content.length < 100) {
    throw new Error("Extracted content was too short to be useful");
  }

  return { title, content, url: url.href };
}
