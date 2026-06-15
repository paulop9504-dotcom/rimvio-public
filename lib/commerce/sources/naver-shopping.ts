import { stripHtmlTags } from "@/lib/commerce/commerce-cleaner";
import type { MarketListing } from "@/lib/commerce/market-listing";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { naverSearch } from "@/lib/naver/search-api";

export type { MarketListing };

export function hasNaverShoppingCredentials() {
  return isNaverSearchConfigured();
}

export async function fetchNaverShoppingListings(
  query: string,
  options?: { display?: number; usedBias?: boolean }
): Promise<MarketListing[]> {
  if (!isNaverSearchConfigured()) {
    return [];
  }

  const searchQuery = options?.usedBias ? `${query} 중고` : query;

  try {
    const result = await naverSearch("shop", searchQuery, {
      display: options?.display ?? 20,
      sort: "asc",
    });

    const listings: MarketListing[] = [];

    for (const item of result.items) {
      const title = stripHtmlTags(item.title ?? "");
      const price = Number.parseInt(item.lprice ?? "", 10);

      if (!title || !Number.isFinite(price) || price <= 0) {
        continue;
      }

      listings.push({
        title,
        price,
        link: item.link,
        source: "naver_shop",
      });
    }

    return listings;
  } catch {
    return [];
  }
}
