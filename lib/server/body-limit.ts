import type { NextRequest } from "next/server";

const DEFAULT_MAX_BYTES = 256 * 1024;

const PATH_LIMITS: Record<string, number> = {
  "/api/experience-bridge/upload-media": 85 * 1024 * 1024,
  "/api/scrape": 32 * 1024,
  "/api/ocr": 8 * 1024 * 1024,
  "/api/beam": 128 * 1024,
  "/api/analytics/event": 16 * 1024,
  "/api/intent/event": 16 * 1024,
  "/api/personalization/click": 16 * 1024,
  "/api/personalization/reopen": 8 * 1024,
  "/api/personalization/merge": 8 * 1024,
};

export function resolveMaxBodyBytes(pathname: string) {
  return PATH_LIMITS[pathname] ?? DEFAULT_MAX_BYTES;
}

export function isBodyTooLarge(request: NextRequest, pathname: string) {
  if (request.method === "GET" || request.method === "HEAD") {
    return false;
  }

  const contentLength = request.headers.get("content-length");
  if (!contentLength) {
    return false;
  }

  const bytes = Number.parseInt(contentLength, 10);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return false;
  }

  return bytes > resolveMaxBodyBytes(pathname);
}
