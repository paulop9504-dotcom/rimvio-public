import type { CompareDestinationId, MarketId, ProductLane } from "@/lib/markets/types";

const LANE_FALLBACK: Record<ProductLane, ProductLane> = {
  tech_secondhand: "general_secondhand",
  tech_new: "general_new",
  fashion_secondhand: "general_secondhand",
  fashion_new: "general_new",
  beauty: "general_new",
  general_secondhand: "general_secondhand",
  general_new: "general_new",
};

export const MARKET_LANE_DESTINATIONS: Record<
  MarketId,
  Partial<Record<ProductLane, CompareDestinationId[]>>
> = {
  kr: {
    tech_secondhand: ["bunjang", "joongna", "daangn", "danawa"],
    tech_new: ["danawa", "naver_shopping", "bunjang"],
    fashion_secondhand: ["bunjang", "daangn", "joongna"],
    fashion_new: ["musinsa", "naver_shopping", "danawa"],
    beauty: ["naver_shopping", "daangn", "danawa"],
    general_secondhand: ["bunjang", "joongna", "daangn", "naver_shopping"],
    general_new: ["naver_shopping", "danawa", "musinsa"],
  },
  us: {
    tech_secondhand: ["ebay", "facebook_marketplace", "amazon", "google_shopping"],
    tech_new: ["amazon", "bestbuy", "google_shopping"],
    fashion_secondhand: ["poshmark", "depop", "ebay", "facebook_marketplace"],
    fashion_new: ["amazon", "google_shopping", "bestbuy"],
    beauty: ["amazon", "google_shopping"],
    general_secondhand: ["ebay", "facebook_marketplace", "amazon"],
    general_new: ["amazon", "google_shopping", "ebay"],
  },
  jp: {
    tech_secondhand: ["mercari", "rakuma", "yahoo_auction_jp", "kakaku"],
    tech_new: ["kakaku", "amazon_jp", "yahoo_auction_jp"],
    fashion_secondhand: ["mercari", "rakuma", "yahoo_auction_jp"],
    fashion_new: ["amazon_jp", "kakaku", "mercari"],
    beauty: ["amazon_jp", "kakaku"],
    general_secondhand: ["mercari", "rakuma", "yahoo_auction_jp"],
    general_new: ["amazon_jp", "kakaku", "mercari"],
  },
  global: {
    tech_secondhand: ["ebay", "amazon", "google_shopping"],
    tech_new: ["amazon", "google_shopping", "ebay"],
    fashion_secondhand: ["ebay", "depop", "google_shopping"],
    fashion_new: ["amazon", "google_shopping"],
    beauty: ["amazon", "google_shopping"],
    general_secondhand: ["ebay", "amazon", "google_shopping"],
    general_new: ["amazon", "google_shopping", "ebay"],
  },
};

export const MARKET_PRIMARY_LABEL: Record<MarketId, string> = {
  kr: "🔍 알맞은 곳에서 비교",
  us: "🔍 Compare on the right site",
  jp: "🔍 適切なサイトで比較",
  global: "🔍 Compare marketplaces",
};

export function laneDestinationIds(market: MarketId, lane: ProductLane) {
  const pack = MARKET_LANE_DESTINATIONS[market];
  const direct = pack[lane];
  if (direct?.length) {
    return direct;
  }

  const fallbackLane = LANE_FALLBACK[lane];
  return pack[fallbackLane] ?? MARKET_LANE_DESTINATIONS.global[fallbackLane] ?? [];
}
