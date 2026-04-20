// Client-side file parsing. All parsing happens in the browser so PDF bytes
// never touch our server. Returns plain text ready to feed into the prompt.

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CONTENT_CHARS = 50_000;

export interface ParsedFile {
  title: string;
  content: string;
}

export class FileTooLargeError extends Error {
  constructor(public sizeBytes: number) {
    super(`File is ${Math.round(sizeBytes / 1024)}KB, which exceeds the 5MB free-tool limit.`);
    this.name = "FileTooLargeError";
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(public fileType: string) {
    super(`Unsupported file type: ${fileType}. Try .pdf, .txt, or .md.`);
    this.name = "UnsupportedFileTypeError";
  }
}

function truncate(text: string): string {
  return text.length > MAX_CONTENT_CHARS ? text.slice(0, MAX_CONTENT_CHARS) : text;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new FileTooLargeError(file.size);
  }

  const lowerName = file.name.toLowerCase();
  const title = file.name.replace(/\.[^.]+$/, "") || "Uploaded file";

  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    const content = await parsePdfInBrowser(file);
    return { title, content: truncate(content) };
  }

  if (
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".markdown") ||
    file.type === "text/plain" ||
    file.type === "text/markdown"
  ) {
    const text = await file.text();
    return { title, content: truncate(text) };
  }

  throw new UnsupportedFileTypeError(file.type || lowerName.split(".").pop() || "unknown");
}

// Lazy-load pdfjs-dist only when a PDF actually arrives — keeps main bundle small.
async function parsePdfInBrowser(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // PDF.js needs a worker — use the bundled one.
  // The legacy build sets a no-op worker when workerSrc is unset; that's fine
  // for small files but slow for large. Set the worker URL explicitly to the
  // file the library ships with. We serve it from /pdf.worker.min.mjs (copied
  // into public/ at build time).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .filter(Boolean);
    pageTexts.push(strings.join(" "));
    if (pageTexts.join(" ").length > MAX_CONTENT_CHARS * 1.5) {
      // Bail early if we're well past our cap — no need to parse remaining pages.
      break;
    }
  }

  return pageTexts.join("\n\n").replace(/\s+/g, " ").trim();
}
