import { NextResponse, type NextRequest } from "next/server";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import {
  naverSearch,
  NaverSearchApiError,
  parseNaverSearchKind,
} from "@/lib/naver/search-api";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = readRequestId(request);
  const params = request.nextUrl.searchParams;

  const kind = parseNaverSearchKind(params.get("type") ?? params.get("kind"));
  const query = params.get("q") ?? params.get("query") ?? "";
  const display = params.get("display");
  const start = params.get("start");
  const sort = params.get("sort");

  if (!kind) {
    return NextResponse.json(
      {
        error:
          "Invalid type. Use local | shop | news | blog | webkr | image | book | encyc | cafearticle",
      },
      { status: 400 }
    );
  }

  if (!isNaverSearchConfigured()) {
    return NextResponse.json(
      {
        error: "Naver Search API is not configured.",
        hint: "Set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET in .env.local",
        docs: "https://developers.naver.com/docs/serviceapi/search/overview/",
      },
      { status: 503 }
    );
  }

  try {
    const result = await naverSearch(kind, query, {
      display: display ? Number.parseInt(display, 10) : undefined,
      start: start ? Number.parseInt(start, 10) : undefined,
      sort: sort ?? undefined,
    });

    logApi("info", "naver_search_ok", {
      route: "/api/naver/search",
      requestId,
      kind,
      total: result.total,
      ms: Date.now() - startedAt,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof NaverSearchApiError ? error.status : 502;
    const message = error instanceof Error ? error.message : "Naver search failed";

    logApi("warn", "naver_search_fail", {
      route: "/api/naver/search",
      requestId,
      kind,
      status,
      message,
      ms: Date.now() - startedAt,
    });

    return NextResponse.json({ error: message }, { status });
  }
}
