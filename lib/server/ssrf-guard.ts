import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}

export function assertSafeOutboundUrl(rawUrl: string) {
  const parsed = normalizeInputUrl(rawUrl);
  const hostname = parsed.hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();

  if (!hostname) {
    throw new Error("Invalid URL host.");
  }

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error("Blocked URL host.");
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    throw new Error("Private network URLs are not allowed.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URLs with credentials are not allowed.");
  }

  if (parsed.port && !["80", "443", "8080", "8443"].includes(parsed.port)) {
    throw new Error("Non-standard ports are not allowed.");
  }

  return parsed.href;
}

export function isSafeOutboundUrl(rawUrl: string) {
  try {
    assertSafeOutboundUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}
