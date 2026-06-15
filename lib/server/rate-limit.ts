import { NextResponse, type NextRequest } from "next/server";
import { readClientIp } from "@/lib/server/request-context";

export type RateLimitTier =
  | "default"
  | "scrape"
  | "telemetry"
  | "room-write"
  | "beam"
  | "bridge-media"
  | "globe-read";

type Bucket = {
  count: number;
  resetAt: number;
};

const STORE = new Map<string, Bucket>();

const LIMITS: Record<RateLimitTier, { windowMs: number; max: number }> = {
  default: { windowMs: 60_000, max: 120 },
  scrape: { windowMs: 60_000, max: 30 },
  telemetry: { windowMs: 60_000, max: 180 },
  "room-write": { windowMs: 60_000, max: 90 },
  beam: { windowMs: 60_000, max: 60 },
  "bridge-media": { windowMs: 60_000, max: 20 },
  "globe-read": { windowMs: 60_000, max: 90 },
};

function pruneStore(now: number) {
  if (STORE.size < 5_000) {
    return;
  }

  for (const [key, bucket] of STORE) {
    if (bucket.resetAt <= now) {
      STORE.delete(key);
    }
  }
}

export function resolveRateLimitTier(pathname: string, method: string): RateLimitTier | null {
  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (pathname === "/api/health") {
    return null;
  }

  if (pathname === "/api/experience-bridge/upload-media" && method === "POST") {
    return "bridge-media";
  }

  if (
    pathname === "/api/globe/external-traces" ||
    pathname === "/api/globe/pins"
  ) {
    return "globe-read";
  }

  if (pathname === "/api/globe/tile") {
    return "globe-read";
  }

  if (pathname === "/api/scrape" || pathname === "/api/scrape/related") {
    return "scrape";
  }

  if (pathname === "/api/ocr") {
    return "scrape";
  }

  if (pathname === "/api/analytics/event" || pathname === "/api/intent/event") {
    return "telemetry";
  }

  if (pathname === "/api/beam" && method === "POST") {
    return "beam";
  }

  if (pathname.startsWith("/api/rooms/") && method === "POST") {
    return "room-write";
  }

  return "default";
}

export function checkRateLimit(request: NextRequest, tier: RateLimitTier) {
  const { windowMs, max } = LIMITS[tier];
  const ip = readClientIp(request);
  const key = `${tier}:${ip}`;
  const now = Date.now();

  pruneStore(now);

  const current = STORE.get(key);
  if (!current || current.resetAt <= now) {
    STORE.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  current.count += 1;

  if (current.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { retryAfterSec, limit: max, remaining: 0 };
  }

  return null;
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many requests. Please retry shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    }
  );
}
