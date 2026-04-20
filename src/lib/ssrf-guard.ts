// Resolve a URL's hostname and reject if it maps to a private/loopback/link-local
// address. Run this *before* letting a URL into the article extractor so we never
// fetch internal services or cloud metadata endpoints from our serverless function.

import { promises as dns } from "node:dns";
import net from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true; // Unparseable → treat as private (fail safe)
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local, includes AWS/GCP metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("ff")) return true; // multicast
  // IPv4-mapped IPv6 (e.g. ::ffff:10.0.0.1) — extract and check v4 half
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true; // unknown family — fail safe
}

/**
 * Validate a user-supplied URL for external fetch.
 * Throws SsrfError on any violation. Returns the parsed URL on success.
 */
export async function validateExternalUrl(raw: string): Promise<URL> {
  if (typeof raw !== "string" || raw.length > 2048) {
    throw new SsrfError("URL is too long or not a string");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("URL is malformed");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only http and https are allowed");
  }

  const hostname = url.hostname;
  if (!hostname) throw new SsrfError("URL has no hostname");

  // Reject literal private addresses (e.g. http://127.0.0.1/, http://[::1]/)
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new SsrfError("URL points to a private address");
    }
    return url;
  }

  // Reject obvious loopback names
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost === "metadata.google.internal" ||
    lowerHost.endsWith(".internal")
  ) {
    throw new SsrfError("URL points to a private hostname");
  }

  // DNS-resolve and check every returned address.
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfError("Could not resolve hostname");
  }
  if (addrs.length === 0) {
    throw new SsrfError("Hostname did not resolve to any address");
  }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new SsrfError("Hostname resolves to a private address");
    }
  }

  return url;
}
