import type { MarketListing } from "@/lib/commerce/market-listing";
import {
  isScraperCircuitOpen,
  recordScraperFailure,
  recordScraperSuccess,
} from "@/lib/commerce/scraper-circuit-breaker";

type BunjangProduct = {
  name?: string;
  price?: string | number;
  pid?: string | number;
};

type BunjangFindResponse = {
  list?: BunjangProduct[];
};

const BUNJANG_SEARCH =
  "https://api.bunjang.co.kr/api/1/find_v2.json";

export function parseBunjangFindResponse(payload: unknown): MarketListing[] {
  const data = payload as BunjangFindResponse;
  const list = data.list ?? [];
  const listings: MarketListing[] = [];

  for (const item of list) {
    const title = item.name?.trim() ?? "";
    const price =
      typeof item.price === "number"
        ? item.price
        : Number.parseInt(String(item.price ?? ""), 10);

    if (!title || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    listings.push({
      title,
      price,
      link: item.pid ? `https://m.bunjang.co.kr/products/${item.pid}` : undefined,
      source: "bunjang_api",
    });
  }

  return listings;
}

/** Public Bunjang search — no API key required. */
export async function fetchBunjangListings(
  query: string,
  options?: { limit?: number }
): Promise<MarketListing[]> {
  if (isScraperCircuitOpen("bunjang")) {
    return [];
  }

  const q = query.trim();
  if (!q) {
    return [];
  }

  const params = new URLSearchParams({
    q,
    order: "score",
    page: "0",
    n: String(Math.min(Math.max(options?.limit ?? 20, 1), 40)),
    stat_device: "w",
    req_ref: "search",
  });

  try {
    const response = await fetch(`${BUNJANG_SEARCH}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; Rimvio/1.0; +https://rimvio.app)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      recordScraperFailure("bunjang");
      return [];
    }

    const payload = (await response.json()) as unknown;
    const listings = parseBunjangFindResponse(payload);
    if (listings.length > 0) {
      recordScraperSuccess("bunjang");
    }
    return listings;
  } catch {
    recordScraperFailure("bunjang");
    return [];
  }
}
