import { stripHtmlTags } from "@/lib/commerce/commerce-cleaner";
import { fetchNaverShoppingListings } from "@/lib/commerce/sources/naver-shopping";
import {
  isScraperCircuitOpen,
  recordScraperFailure,
  recordScraperSuccess,
} from "@/lib/commerce/scraper-circuit-breaker";
import type { RawProductCandidate } from "@/lib/product-injector/types";

const NAVER_SHOP_SEARCH = "https://search.shopping.naver.com/search/all";

export function parseNaverShoppingWebProducts(raw: string): RawProductCandidate[] {
  const products: RawProductCandidate[] = [];
  const seenUrls = new Set<string>();

  const blockPattern =
    /"(?:productName|title)"\s*:\s*"([^"]{4,200})"[\s\S]{0,400}?"(?:productUrl|crUrl|mallProductUrl|link)"\s*:\s*"(https?:\\\/\\\/[^"]+|https?:\/\/[^"]+)"[\s\S]{0,120}?"(?:lowPrice|price|salePrice)"\s*:\s*"?(\d{3,9})"?/gi;

  for (const match of raw.matchAll(blockPattern)) {
    const name = stripHtmlTags(match[1] ?? "").trim();
    const url = (match[2] ?? "").replace(/\\\//g, "/").trim();
    const price = Number.parseInt(match[3] ?? "", 10);

    if (!name || !url || !Number.isFinite(price) || price <= 0 || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    products.push({
      name,
      price,
      source_url: url,
      source: "naver_shop_web",
    });
  }

  return products.slice(0, 30);
}

export async function fetchWebProductCandidates(query: string): Promise<RawProductCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const fromApi: RawProductCandidate[] = [];

  const apiListings = await fetchNaverShoppingListings(trimmed, { display: 30, usedBias: false });
  for (const listing of apiListings) {
    if (!listing.link?.trim()) {
      continue;
    }
    fromApi.push({
      name: listing.title,
      price: listing.price,
      source_url: listing.link,
      source: "naver_shop",
    });
  }

  if (fromApi.length >= 3) {
    return fromApi;
  }

  if (isScraperCircuitOpen("naver_web")) {
    return fromApi;
  }

  const url = `${NAVER_SHOP_SEARCH}?${new URLSearchParams({ query: trimmed, sort: "rel" }).toString()}`;

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
      return fromApi;
    }

    const html = await response.text();
    const webProducts = parseNaverShoppingWebProducts(html);
    if (webProducts.length > 0) {
      recordScraperSuccess("naver_web");
    }

    const merged = [...fromApi];
    const seen = new Set(fromApi.map((p) => p.source_url));
    for (const product of webProducts) {
      if (!seen.has(product.source_url)) {
        merged.push(product);
        seen.add(product.source_url);
      }
    }
    return merged;
  } catch {
    recordScraperFailure("naver_web");
    return fromApi;
  }
}
