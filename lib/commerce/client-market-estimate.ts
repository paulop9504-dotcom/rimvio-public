import {
  estimateMedianBand,
  estimateMedianFromTrueCost,
} from "@/lib/commerce/market-estimate-fallback";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import { buildCompareQuery } from "@/lib/commerce/compare-query";
import { parsePriceToWon } from "@/lib/links/extract-price-hint";

function buildSnapshotFromMedian(input: {
  query: string;
  listingPrice: number;
  median: number;
  estimateKind: MarketPriceSnapshot["estimateKind"];
  source: string;
  detail: string;
}): MarketPriceSnapshot {
  const deltaPercent = Math.round(
    ((input.listingPrice - input.median) / input.median) * 100
  );
  const ratio = input.listingPrice / input.median;
  const verdict =
    ratio >= 1.1 ? "high" : ratio <= 0.9 ? "bargain" : ("fair" as const);

  return {
    available: true,
    query: input.query,
    listingPrice: input.listingPrice,
    sampleCount: 1,
    filteredCount: 1,
    average: input.median,
    median: input.median,
    minSafe: Math.round(input.median * 0.92),
    maxSafe: Math.round(input.median * 1.08),
    deltaPercent,
    verdict,
    confidence: "low",
    estimateKind: input.estimateKind,
    sources: [input.source],
    headline:
      verdict === "high"
        ? `시세 대비 약 ${deltaPercent}% 높아요`
        : verdict === "bargain"
          ? `시세 대비 약 ${Math.abs(deltaPercent)}% 낮아요`
          : "적정 범위로 보여요",
    detail: input.detail,
    disclaimer:
      "AI·모델 추정치 · 실시간 시세 지연 중 · 거래 전 직접 확인하세요.",
  };
}

/** Instant client/server provisional snapshot — no network. */
export function buildProvisionalMarketSnapshot(input: {
  title: string;
  domain?: string | null;
}): MarketPriceSnapshot | null {
  const query = buildCompareQuery(input.title, input.domain) ?? input.title.trim();
  const listingPrice =
    parsePriceToWon(input.title) ??
    parsePriceToWon(input.domain ?? "");

  if (!listingPrice || listingPrice <= 0) {
    return null;
  }

  const trueCostEstimate = estimateMedianFromTrueCost({
    title: input.title,
    domain: input.domain,
    listingPrice,
  });

  if (trueCostEstimate) {
    return buildSnapshotFromMedian({
      query,
      listingPrice,
      median: trueCostEstimate.median,
      estimateKind: "true_cost_model",
      source: trueCostEstimate.source,
      detail: `${trueCostEstimate.detail} · 즉시 추정`,
    });
  }

  const band = estimateMedianBand(listingPrice);
  return buildSnapshotFromMedian({
    query,
    listingPrice,
    median: band.median,
    estimateKind: "estimate_band",
    source: band.source,
    detail: `${band.detail} · 즉시 추정`,
  });
}
