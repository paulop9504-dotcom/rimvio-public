import { buildTrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import type { MarketListing } from "@/lib/commerce/market-listing";
import { isTechListingTitle } from "@/lib/commerce/tech-category";

export type EstimatedMedian = {
  median: number;
  source: MarketListing["source"];
  detail: string;
};

/** Tech hold-cost curve → rough used-market median. */
export function estimateMedianFromTrueCost(input: {
  title: string;
  domain?: string | null;
  listingPrice: number;
}): EstimatedMedian | null {
  if (!isTechListingTitle(input.title, input.domain)) {
    return null;
  }

  const receipt = buildTrueCostReceipt({
    title: input.title,
    domain: input.domain,
    surfacePrice: input.listingPrice,
  });

  if (!receipt.available) {
    return null;
  }

  const median = Math.round(
    receipt.surfacePrice * 0.55 + receipt.expectedResalePrice * 0.45
  );

  return {
    median,
    source: "true_cost_model",
    detail: "Rimvio 감가 모델 기반 추정 시세",
  };
}

/** Last-resort band when listing exists but no external samples. */
export function estimateMedianBand(listingPrice: number): EstimatedMedian {
  return {
    median: Math.round(listingPrice * 0.97),
    source: "estimate_band",
    detail: "표본 부족 · 보수적 추정 시세",
  };
}
