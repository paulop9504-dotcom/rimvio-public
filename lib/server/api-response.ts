import { NextResponse } from "next/server";
import { REQUEST_ID_HEADER } from "@/lib/server/request-context";

export function jsonOk<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, withRequestHeaders(init));
}

export function jsonError(
  status: number,
  message: string,
  requestId?: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: message, ...extra },
    withRequestHeaders({
      status,
      headers: requestId ? { [REQUEST_ID_HEADER]: requestId } : undefined,
    })
  );
}

function withRequestHeaders(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  };
}

export function withCacheHeaders(response: NextResponse, cacheControl: string) {
  response.headers.set("Cache-Control", cacheControl);
  return response;
}
