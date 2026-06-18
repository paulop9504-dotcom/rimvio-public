export type MarketId = "kr" | "us" | "jp" | "global";

export type ProductLane =
  | "tech_secondhand"
  | "tech_new"
  | "fashion_secondhand"
  | "fashion_new"
  | "beauty"
  | "general_secondhand"
  | "general_new";

export type CompareDestinationId =
  | "bunjang"
  | "joongna"
  | "daangn"
  | "danawa"
  | "naver_shopping"
  | "musinsa"
  | "ebay"
  | "amazon"
  | "facebook_marketplace"
  | "google_shopping"
  | "bestbuy"
  | "mercari"
  | "rakuma"
  | "kakaku"
  | "amazon_jp"
  | "yahoo_auction_jp"
  | "poshmark"
  | "depop";

export type CompareDestination = {
  id: CompareDestinationId;
  label: string;
  shortLabel: string;
  domainPattern: RegExp;
  buildHref: (query: string) => string;
};

export type CompareDestinationPlan = {
  market: MarketId;
  lane: ProductLane;
  query: string;
  primaryLabel: string;
  destinations: CompareDestination[];
};
