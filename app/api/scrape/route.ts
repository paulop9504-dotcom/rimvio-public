import { NextResponse, type NextRequest } from "next/server";
import { resolveCategory } from "@/lib/categories/resolve-category";
import { isLinkCategory } from "@/lib/categories/types";
import { insertEnrichedLink } from "@/lib/enrichers/persist";
import { persistBeamSnapshot } from "@/lib/beam/resolve-beam";
import { toBeamSnapshot } from "@/lib/share/beam-url";
import { enrichUrl } from "@/lib/enrichers/registry";
import type { EnrichedLink, EnricherContext } from "@/lib/enrichers/types";
import { getAuthUserId } from "@/lib/auth/session";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";
import { readScrapeCache, writeScrapeCache } from "@/lib/server/scrape-cache";
import { classifyUrlIntent } from "@/lib/intent/gemini-url-intent";
import type { UrlIntentResult } from "@/lib/intent/gemini-url-intent";
import { cleanUrl } from "@/lib/share/clean-url";
import {
  scrapeUrlMetadata,
  type UrlPageMetadata,
} from "@/lib/share/scrape-url-metadata";
import { urlPageMetadataToPageMetadata } from "@/lib/share/url-metadata-bridge";
import { assertSafeOutboundUrl } from "@/lib/server/ssrf-guard";
import { tryCreateClient } from "@/lib/supabase/server";
import type { LinkRow } from "@/types/database";

export const maxDuration = 30;
export const runtime = "nodejs";

export type ScrapeFallback = EnrichedLink["fallback"];

export type ScrapeResult = EnrichedLink & {
  link?: LinkRow;
  linkCategory?: string;
  cleanedUrl?: string;
  pageMetadata?: UrlPageMetadata;
  urlIntent?: UrlIntentResult;
};

type ScrapeRequestBody = {
  url?: string;
  persist?: boolean;
  category?: string;
  expiresAt?: string;
  context?: Partial<EnricherContext>;
  classifyIntent?: boolean;
};

function getUrlFromRequest(request: NextRequest) {
  return request.nextUrl.searchParams.get("url");
}

async function getBody(request: NextRequest): Promise<ScrapeRequestBody> {
  try {
    return (await request.json()) as ScrapeRequestBody;
  } catch {
    return {};
  }
}

function readClassifyIntent(
  request: NextRequest,
  body?: ScrapeRequestBody
) {
  if (body?.classifyIntent) {
    return true;
  }

  const flag = request.nextUrl.searchParams.get("intent");
  return flag === "1" || flag === "true";
}

async function handleScrape(
  rawUrl: string,
  options?: {
    persist?: boolean;
    category?: string;
    expiresAt?: string;
    context?: Partial<EnricherContext>;
    classifyIntent?: boolean;
  }
) {
  const cleanedUrl = cleanUrl(rawUrl);
  const safeUrl = assertSafeOutboundUrl(cleanedUrl);

  if (!options?.persist) {
    const cached = await readScrapeCache(safeUrl);
    if (cached) {
      return { result: { ...cached, cleanedUrl: safeUrl }, cached: true as const };
    }
  }

  let enriched;
  let intentFields: {
    pageMetadata?: UrlPageMetadata;
    urlIntent?: UrlIntentResult;
  } = {};

  if (options?.classifyIntent) {
    const pageMetadata = await scrapeUrlMetadata(safeUrl);
    const preloadedPageMetadata = urlPageMetadataToPageMetadata(pageMetadata);

    const [enrichedResult, urlIntent] = await Promise.all([
      enrichUrl(safeUrl, {
        ...options?.context,
        preloadedPageMetadata,
      }),
      classifyUrlIntent({
        url: safeUrl,
        metadata: pageMetadata,
      }),
    ]);

    enriched = enrichedResult;
    intentFields = { pageMetadata, urlIntent };
  } else {
    enriched = await enrichUrl(safeUrl, options?.context);
  }

  const linkCategory = resolveCategory(enriched);

  if (!options?.persist) {
    const preview = {
      ...enriched,
      linkCategory,
      cleanedUrl: safeUrl,
      ...intentFields,
    };
    await writeScrapeCache(safeUrl, preview);
    return { result: preview, cached: false as const };
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return {
      result: {
        ...enriched,
        linkCategory,
        cleanedUrl: safeUrl,
        ...intentFields,
      },
      cached: false as const,
    };
  }

  const userId = await getAuthUserId();

  const link = await insertEnrichedLink(supabase, enriched, {
    category:
      options?.category && isLinkCategory(options.category)
        ? options.category
        : resolveCategory(enriched),
    expiresAt: options?.expiresAt ?? null,
    userId,
  });

  if (link.share_slug) {
    persistBeamSnapshot(toBeamSnapshot(link));
  }

  return {
    result: {
      ...enriched,
      linkCategory,
      link,
      cleanedUrl: safeUrl,
      ...intentFields,
    },
    cached: false as const,
  };
}

function scrapeResponse(
  request: NextRequest,
  result: ScrapeResult,
  cached: boolean,
  startedAt: number
) {
  const requestId = readRequestId(request);
  logApi("info", "scrape_ok", {
    route: "/api/scrape",
    method: request.method,
    requestId,
    status: 200,
    durationMs: Date.now() - startedAt,
    detail: cached ? "cache_hit" : "fresh",
  });

  return NextResponse.json(result, {
    headers: cached ? { "X-Scrape-Cache": "HIT" } : { "X-Scrape-Cache": "MISS" },
  });
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const rawUrl = getUrlFromRequest(request);

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing url query parameter." },
      { status: 400 }
    );
  }

  try {
    const { result, cached } = await handleScrape(rawUrl, {
      classifyIntent: readClassifyIntent(request),
    });
    return scrapeResponse(request, result, cached, startedAt);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid URL.";

    logApi("warn", "scrape_failed", {
      route: "/api/scrape",
      method: request.method,
      requestId: readRequestId(request),
      status: 400,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const body = await getBody(request);
  const rawUrl = body.url ?? null;

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing url in request body." },
      { status: 400 }
    );
  }

  try {
    const { result, cached } = await handleScrape(rawUrl, {
      persist: body.persist,
      category: body.category,
      expiresAt: body.expiresAt,
      context: body.context,
      classifyIntent: readClassifyIntent(request, body),
    });
    return scrapeResponse(request, result, cached && !body.persist, startedAt);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid URL.";

    logApi("warn", "scrape_failed", {
      route: "/api/scrape",
      method: request.method,
      requestId: readRequestId(request),
      status: 400,
      durationMs: Date.now() - startedAt,
      detail: message,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
