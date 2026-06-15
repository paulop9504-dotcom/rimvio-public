import {
  passesSecondhandBlacklist,
  stripHtmlTags,
} from "@/lib/commerce/commerce-cleaner";
import { buildCompareQuery } from "@/lib/commerce/compare-query";
import {
  estimateMedianBand,
  estimateMedianFromTrueCost,
} from "@/lib/commerce/market-estimate-fallback";
import type { MarketEstimateKind } from "@/lib/commerce/market-listing";
import type { MarketListing } from "@/lib/commerce/market-listing";
import { fetchBunjangListings } from "@/lib/commerce/sources/bunjang-search";
import {
  fetchNaverShoppingListings,
  hasNaverShoppingCredentials,
} from "@/lib/commerce/sources/naver-shopping";
import { fetchNaverShoppingWebListings } from "@/lib/commerce/sources/naver-shopping-web";
import { jaccardSimilarity } from "@/lib/commerce/text-similarity";
import { computeTruncatedMean } from "@/lib/commerce/truncated-mean";
import { parsePriceToWon } from "@/lib/links/extract-price-hint";
import {
  marketPriceCacheKey,
  marketPriceCacheTtlMs,
  readMarketPriceCache,
  writeMarketPriceCache,
} from "@/lib/server/market-price-cache";

export const MARKET_JACCARD_MIN = 0.6;

export type MarketVerdict = "bargain" | "fair" | "high" | "unknown";

export type MarketPriceConfidence = "low" | "medium" | "high";

export type MarketPriceSnapshot = {
  available: boolean;
  query: string;
  listingPrice: number | null;
  sampleCount: number;
  filteredCount: number;
  average: number | null;
  median: number | null;
  minSafe: number | null;
  maxSafe: number | null;
  deltaPercent: number | null;
  verdict: MarketVerdict;
  confidence: MarketPriceConfidence;
  estimateKind: MarketEstimateKind;
  sources: string[];
  headline: string;
  detail: string;
  disclaimer: string;
};

function formatWon(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function resolveConfidence(filteredCount: number): MarketPriceConfidence {
  if (filteredCount >= 8) {
    return "high";
  }

  if (filteredCount >= 4) {
    return "medium";
  }

  return "low";
}

function resolveVerdict(
  listingPrice: number | null,
  median: number | null,
  filteredCount: number,
  mode: "strict" | "fallback" = "strict"
): MarketVerdict {
  if (!listingPrice || !median || filteredCount < 1) {
    return "unknown";
  }

  const ratio = listingPrice / median;
  const bargainCutoff = mode === "fallback" ? 0.9 : 0.88;
  const highCutoff = mode === "fallback" ? 1.1 : 1.12;

  if (ratio <= bargainCutoff) {
    return "bargain";
  }

  if (ratio >= highCutoff) {
    return "high";
  }

  return "fair";
}

function buildHeadline(
  verdict: MarketVerdict,
  deltaPercent: number | null,
  median: number | null
) {
  const medianLabel = formatWon(median);

  switch (verdict) {
    case "bargain":
      return deltaPercent !== null
        ? `시세 대비 약 ${Math.abs(deltaPercent)}% 낮아요`
        : "시세 대비 저렴해 보여요";
    case "fair":
      return medianLabel
        ? `적정 범위 · 참고 중앙값 ${medianLabel}`
        : "적정 범위로 보여요";
    case "high":
      return deltaPercent !== null
        ? `시세 대비 약 ${deltaPercent}% 높아요`
        : "시세 대비 높아 보여요";
    default:
      return "비교 데이터가 아직 부족해요";
  }
}

function buildDetail(input: {
  filteredCount: number;
  sources: string[];
  listingPrice: number | null;
  minSafe: number | null;
  maxSafe: number | null;
  estimateDetail?: string | null;
}) {
  const listing = formatWon(input.listingPrice);
  const range =
    input.minSafe !== null && input.maxSafe !== null
      ? `${formatWon(input.minSafe)}~${formatWon(input.maxSafe)}`
      : null;

  const sourceLabel = input.sources.includes("naver_shop")
    ? "네이버쇼핑 유사 매물"
    : input.sources.includes("bunjang_api")
      ? "번개장터 유사 매물"
      : input.sources.includes("naver_shop_web")
        ? "네이버쇼핑 검색"
        : input.sources.includes("true_cost_model")
          ? "Rimvio 감가 추정"
          : input.sources.includes("estimate_band")
            ? "보수적 추정"
            : "외부 검색";

  const parts = [
    input.estimateDetail ?? `${sourceLabel} ${input.filteredCount}건 기준`,
    listing ? `이 매물 ${listing}` : null,
    range ? `안전 구간 ${range}` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function filterRelevantListings(query: string, listings: MarketListing[]) {
  return listings.filter((listing) => {
    if (!passesSecondhandBlacklist(listing.title)) {
      return false;
    }

    if (listing.source === "naver_shop_web" && listing.title === "naver shopping result") {
      return true;
    }

    return jaccardSimilarity(query, stripHtmlTags(listing.title)) >= MARKET_JACCARD_MIN;
  });
}

function usedBias(domain?: string | null, title?: string) {
  return (
    /joongna|junggo|bunjang|daangn|karrot/i.test(domain ?? "") ||
    /중고|직거래|급처|네고/i.test(title ?? "")
  );
}

async function fetchFallbackListings(input: {
  query: string;
  domain?: string | null;
  title: string;
}) {
  const bias = usedBias(input.domain, input.title);
  const searchQuery = bias ? `${input.query} 중고` : input.query;

  const [bunjang, naverWeb, naverUsedWeb] = await Promise.all([
    fetchBunjangListings(searchQuery),
    fetchNaverShoppingWebListings(input.query),
    bias
      ? fetchNaverShoppingWebListings(searchQuery)
      : Promise.resolve([] as MarketListing[]),
  ]);

  return [...bunjang, ...naverWeb, ...naverUsedWeb];
}

function buildSnapshotFromListings(input: {
  query: string;
  listingPrice: number | null;
  listings: MarketListing[];
  estimateKind: MarketEstimateKind;
  mode: "strict" | "fallback";
  estimateDetail?: string | null;
}): MarketPriceSnapshot {
  const filtered = filterRelevantListings(input.query, input.listings);
  const prices = filtered.map((item) => item.price);
  const stats = computeTruncatedMean(prices);
  const median = stats.median;
  const verdict = resolveVerdict(
    input.listingPrice,
    median,
    filtered.length,
    input.mode
  );
  const confidence = resolveConfidence(filtered.length);
  const deltaPercent =
    input.listingPrice && median
      ? Math.round(((input.listingPrice - median) / median) * 100)
      : null;
  const sources = [...new Set(filtered.map((item) => item.source))];

  const hasVerdict = verdict !== "unknown";

  return {
    available: hasVerdict,
    query: input.query,
    listingPrice: input.listingPrice,
    sampleCount: input.listings.length,
    filteredCount: filtered.length,
    average: stats.average,
    median,
    minSafe: stats.minSafe,
    maxSafe: stats.maxSafe,
    deltaPercent,
    verdict,
    confidence,
    estimateKind: input.estimateKind,
    sources,
    headline: buildHeadline(verdict, deltaPercent, median),
    detail: buildDetail({
      filteredCount: filtered.length,
      sources,
      listingPrice: input.listingPrice,
      minSafe: stats.minSafe,
      maxSafe: stats.maxSafe,
      estimateDetail: input.estimateDetail,
    }),
    disclaimer:
      input.estimateKind === "api"
        ? "참고용 · 제목/옵션 차이로 실제 시세와 다를 수 있어요."
        : "AI·웹 추정치 · 틀릴 수 있으나 침묵하지 않습니다 · 거래 전 직접 확인하세요.",
  };
}

function buildSnapshotFromEstimatedMedian(input: {
  query: string;
  listingPrice: number;
  median: number;
  source: MarketListing["source"];
  detail: string;
  estimateKind: MarketEstimateKind;
}): MarketPriceSnapshot {
  const filteredCount = 1;
  const deltaPercent = Math.round(
    ((input.listingPrice - input.median) / input.median) * 100
  );
  const verdict = resolveVerdict(
    input.listingPrice,
    input.median,
    filteredCount,
    "fallback"
  );

  return {
    available: verdict !== "unknown",
    query: input.query,
    listingPrice: input.listingPrice,
    sampleCount: 1,
    filteredCount,
    average: input.median,
    median: input.median,
    minSafe: Math.round(input.median * 0.92),
    maxSafe: Math.round(input.median * 1.08),
    deltaPercent,
    verdict,
    confidence: "low",
    estimateKind: input.estimateKind,
    sources: [input.source],
    headline: buildHeadline(verdict, deltaPercent, input.median),
    detail: buildDetail({
      filteredCount,
      sources: [input.source],
      listingPrice: input.listingPrice,
      minSafe: Math.round(input.median * 0.92),
      maxSafe: Math.round(input.median * 1.08),
      estimateDetail: input.detail,
    }),
    disclaimer:
      "AI·모델 추정치 · 틀릴 수 있으나 침묵하지 않습니다 · 거래 전 직접 확인하세요.",
  };
}

export async function buildMarketPriceSnapshotFresh(input: {
  title: string;
  domain?: string | null;
  listingPriceText?: string | null;
}): Promise<MarketPriceSnapshot> {
  const query = buildCompareQuery(input.title, input.domain) ?? input.title.trim();
  const listingPrice =
    parsePriceToWon(input.listingPriceText) ??
    parsePriceToWon(input.title);

  if (!listingPrice || listingPrice <= 0) {
    return {
      available: false,
      query,
      listingPrice,
      sampleCount: 0,
      filteredCount: 0,
      average: null,
      median: null,
      minSafe: null,
      maxSafe: null,
      deltaPercent: null,
      verdict: "unknown",
      confidence: "low",
      estimateKind: "estimate_band",
      sources: [],
      headline: "가격 비교 준비",
      detail: "매물가를 찾지 못했어요",
      disclaimer: "참고용 · 거래 전 직접 확인하세요.",
    };
  }

  if (hasNaverShoppingCredentials()) {
    const bias = usedBias(input.domain, input.title);
    const [primary, usedListings] = await Promise.all([
      fetchNaverShoppingListings(query, { display: 20 }),
      bias
        ? fetchNaverShoppingListings(query, { display: 20, usedBias: true })
        : Promise.resolve([] as MarketListing[]),
    ]);

    const merged = [...primary, ...usedListings];
    const apiSnapshot = buildSnapshotFromListings({
      query,
      listingPrice,
      listings: merged,
      estimateKind: "api",
      mode: "strict",
    });

    if (apiSnapshot.available && apiSnapshot.verdict !== "unknown") {
      return apiSnapshot;
    }
  }

  const fallbackListings = await fetchFallbackListings({
    query,
    domain: input.domain,
    title: input.title,
  });

  const webSnapshot = buildSnapshotFromListings({
    query,
    listingPrice,
    listings: fallbackListings,
    estimateKind: "web_scrape",
    mode: "fallback",
  });

  if (webSnapshot.available && webSnapshot.verdict !== "unknown") {
    return webSnapshot;
  }

  const trueCostEstimate = estimateMedianFromTrueCost({
    title: input.title,
    domain: input.domain,
    listingPrice,
  });

  if (trueCostEstimate) {
    return buildSnapshotFromEstimatedMedian({
      query,
      listingPrice,
      median: trueCostEstimate.median,
      source: trueCostEstimate.source,
      detail: trueCostEstimate.detail,
      estimateKind: "true_cost_model",
    });
  }

  const bandEstimate = estimateMedianBand(listingPrice);
  return buildSnapshotFromEstimatedMedian({
    query,
    listingPrice,
    median: bandEstimate.median,
    source: bandEstimate.source,
    detail: bandEstimate.detail,
    estimateKind: "estimate_band",
  });
}

/** Cached market snapshot — L-Minus 1 layer (6h secondhand / 1h commerce). */
export async function buildMarketPriceSnapshot(input: {
  title: string;
  domain?: string | null;
  listingPriceText?: string | null;
}): Promise<MarketPriceSnapshot> {
  const query = buildCompareQuery(input.title, input.domain) ?? input.title.trim();
  const listingPrice =
    parsePriceToWon(input.listingPriceText) ??
    parsePriceToWon(input.title);
  const cacheKey = marketPriceCacheKey({
    query,
    domain: input.domain,
    listingPrice,
  });
  const ttlMs = marketPriceCacheTtlMs(input.domain);

  const cached = await readMarketPriceCache(cacheKey, ttlMs);
  if (cached) {
    return cached;
  }

  const snapshot = await buildMarketPriceSnapshotFresh(input);
  if (snapshot.available) {
    await writeMarketPriceCache(cacheKey, snapshot);
  }

  return snapshot;
}
