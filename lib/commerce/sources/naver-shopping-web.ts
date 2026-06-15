import { stripHtmlTags } from "@/lib/commerce/commerce-cleaner";
import type { MarketListing } from "@/lib/commerce/market-listing";
import {
  isScraperCircuitOpen,
  recordScraperFailure,
  recordScraperSuccess,
} from "@/lib/commerce/scraper-circuit-breaker";

const NAVER_SHOP_SEARCH =
  "https://search.shopping.naver.com/search/all";

/** Parse embedded product prices from Naver Shopping HTML/JSON blobs. */
export function parseNaverShoppingWebPrices(raw: string): MarketListing[] {
  const listings: MarketListing[] = [];
  const seen = new Set<number>();

  const patterns = [
    /"lowPrice"\s*:\s*"?(\d{4,9})"?/g,
    /"price"\s*:\s*"?(\d{4,9})"?/g,
    /"salePrice"\s*:\s*"?(\d{4,9})"?/g,
    /class="[^"]*price[^"]*"[^>]*>\s*([\d,]{4,12})\s*원/gi,
  ];

  for (const pattern of patterns) {
    for (const match of raw.matchAll(pattern)) {
      const price = Number.parseInt(String(match[1]).replace(/,/g, ""), 10);
      if (!Number.isFinite(price) || price < 10_000 || seen.has(price)) {
        continue;
      }

      seen.add(price);
      listings.push({
        title: "naver shopping result",
        price,
        source: "naver_shop_web",
      });

      if (listings.length >= 24) {
        return listings;
      }
    }
  }

  const titlePricePattern =
    /"productName"\s*:\s*"([^"]{4,120})"[\s\S]{0,120}?"lowPrice"\s*:\s*"?(\d{4,9})"?/g;

  for (const match of raw.matchAll(titlePricePattern)) {
    const title = stripHtmlTags(match[1] ?? "").trim();
    const price = Number.parseInt(match[2] ?? "", 10);
    if (!title || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    listings.push({
      title,
      price,
      source: "naver_shop_web",
    });
  }

  return listings.slice(0, 24);
}

export async function fetchNaverShoppingWebListings(
  query: string
): Promise<MarketListing[]> {
  if (isScraperCircuitOpen("naver_web")) {
    return [];
  }

  const q = query.trim();
  if (!q) {
    return [];
  }

  const url = `${NAVER_SHOP_SEARCH}?${new URLSearchParams({ query: q, sort: "price_asc" }).toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/json",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      recordScraperFailure("naver_web");
      return [];
    }

    const html = await response.text();
    const listings = parseNaverShoppingWebPrices(html);
    if (listings.length > 0) {
      recordScraperSuccess("naver_web");
    }
    return listings;
  } catch {
    recordScraperFailure("naver_web");
    return [];
  }
}
