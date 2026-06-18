import { NextResponse, type NextRequest } from "next/server";
import { discoverRelatedLinks } from "@/lib/links/discover-related-links";
import { logApi } from "@/lib/server/logger";
import {
  readRelatedLinksCache,
  writeRelatedLinksCache,
} from "@/lib/server/related-links-cache";
import { readRequestId } from "@/lib/server/request-context";
import { assertSafeOutboundUrl } from "@/lib/server/ssrf-guard";

export const maxDuration = 30;
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = readRequestId(request);
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing url query parameter." },
      { status: 400 }
    );
  }

  try {
    const safeUrl = assertSafeOutboundUrl(rawUrl);
    const cached = await readRelatedLinksCache(safeUrl);

    if (cached) {
      logApi("info", "related_links_ok", {
        route: "/api/scrape/related",
        method: "GET",
        requestId,
        status: 200,
        durationMs: Date.now() - startedAt,
        detail: "cache_hit",
      });

      return NextResponse.json(
        { links: cached },
        { headers: { "X-Related-Cache": "HIT" } }
      );
    }

    const title = request.nextUrl.searchParams.get("title");
    const domain = request.nextUrl.searchParams.get("domain");
    const category = request.nextUrl.searchParams.get("category");
    const sourceType = request.nextUrl.searchParams.get("source_type");

    const links = await discoverRelatedLinks(safeUrl, {
      title: title ?? undefined,
      domain: domain ?? undefined,
      category,
      source_type: sourceType,
      url: safeUrl,
    });

    await writeRelatedLinksCache(safeUrl, links);

    logApi("info", "related_links_ok", {
      route: "/api/scrape/related",
      method: "GET",
      requestId,
      status: 200,
      durationMs: Date.now() - startedAt,
      detail: `fresh:${links.length}`,
    });

    return NextResponse.json(
      { links },
      { headers: { "X-Related-Cache": "MISS" } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid URL.";

    logApi("warn", "related_links_failed", {
      route: "/api/scrape/related",
      method: "GET",
      requestId,
      status: 400,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
