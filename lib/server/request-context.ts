import type { NextRequest } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";

export function createRequestId() {
  return crypto.randomUUID();
}

export function readClientIp(request: NextRequest | Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "local";
}

export function readRequestId(request: NextRequest | Request) {
  return request.headers.get(REQUEST_ID_HEADER) ?? createRequestId();
}
