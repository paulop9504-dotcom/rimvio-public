export type MarketListingSource =
  | "naver_shop"
  | "naver_shop_web"
  | "bunjang_api"
  | "true_cost_model"
  | "estimate_band";

export type MarketListing = {
  title: string;
  price: number;
  link?: string;
  source: MarketListingSource;
};

export type MarketEstimateKind =
  | "api"
  | "web_scrape"
  | "true_cost_model"
  | "estimate_band";
