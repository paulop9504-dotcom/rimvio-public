import type { MarketPriceSnapshot, MarketVerdict } from "@/lib/commerce/market-price";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";

export type CommerceVerdictKind =
  | "overpriced"
  | "bargain"
  | "fair"
  | "depreciation"
  | "pending";

export type CommerceStampLabel =
  | "PASS"
  | "CHECK"
  | "HOLD"
  | "PENDING"
  | "EST. PASS"
  | "EST. CHECK"
  | "EST. HOLD";

export type CommerceVerdictAccent = "rose" | "blue" | "amber" | "muted";

export type CommerceHeroUnit = "won" | "won_per_period" | "none";

export type CommerceHeroMetric = {
  signed: "+" | "-" | "~";
  amount: number | null;
  unit: CommerceHeroUnit;
  periodMonths?: number | null;
};

export type CommerceVerdictPresentation = {
  kind: CommerceVerdictKind;
  stampLabel: CommerceStampLabel;
  accent: CommerceVerdictAccent;
  verdictHeadline: string;
  heroMetric: CommerceHeroMetric;
  /** 0 = cheap end, 50 = center, 100 = expensive end */
  spectrumPosition: number;
  subline: string;
  isEstimated: boolean;
};

export function isEstimatedMarketSnapshot(
  market: MarketPriceSnapshot | null | undefined
) {
  if (!market?.available) {
    return false;
  }

  return (
    market.estimateKind === "true_cost_model" ||
    market.estimateKind === "estimate_band" ||
    (market.estimateKind === "web_scrape" && market.confidence === "low")
  );
}

export type CommerceVerdictInput = {
  market?: MarketPriceSnapshot | null;
  trueCost?: TrueCostReceipt | null;
  listingPrice?: number | null;
  medianPrice?: number | null;
  verdict?: MarketVerdict | null;
};

const SPECTRUM_CLAMP_PERCENT = 30;
const MARKET_DELTA_THRESHOLD = 10_000;

function formatShortWon(value: number) {
  const rounded = Math.round(value);
  if (rounded >= 10_000) {
    const man = rounded / 10_000;
    const label = Number.isInteger(man) ? `${man}` : `${Math.round(man * 10) / 10}`;
    return `${label}만 원`;
  }

  return `${rounded.toLocaleString("ko-KR")}원`;
}

function formatSublineWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function resolveListingAndMedian(input: CommerceVerdictInput) {
  const market = input.market ?? null;
  const trueCost = input.trueCost ?? null;
  const marketHasListing = market?.listingPrice != null && market.listingPrice > 0;

  const listingPrice =
    input.listingPrice ??
    (marketHasListing ? market!.listingPrice : null) ??
    trueCost?.surfacePrice ??
    null;

  const medianPrice = market?.median ?? input.medianPrice ?? null;
  const verdict = market?.verdict ?? input.verdict ?? null;
  const marketKnown = Boolean(
    market?.available &&
      market.verdict &&
      market.verdict !== "unknown" &&
      market.median
  );
  const trueCostOk = Boolean(trueCost?.available);

  return {
    listingPrice,
    medianPrice,
    verdict,
    marketKnown,
    trueCostOk,
    deltaPercent: market?.deltaPercent ?? null,
    trueCost,
  };
}

function spectrumFromDeltaPercent(deltaPercent: number | null) {
  if (deltaPercent === null || !Number.isFinite(deltaPercent)) {
    return 50;
  }

  const clamped = Math.max(
    -SPECTRUM_CLAMP_PERCENT,
    Math.min(SPECTRUM_CLAMP_PERCENT, deltaPercent)
  );
  const position = 50 + (clamped / SPECTRUM_CLAMP_PERCENT) * 50;
  return Math.round(Math.max(5, Math.min(95, position)));
}

function resolveKind(input: CommerceVerdictInput): CommerceVerdictKind {
  const { verdict, marketKnown, trueCostOk } = resolveListingAndMedian(input);

  if (marketKnown) {
    if (verdict === "high") {
      return "overpriced";
    }

    if (verdict === "bargain") {
      return "bargain";
    }

    if (verdict === "fair") {
      return trueCostOk ? "depreciation" : "fair";
    }
  }

  if (trueCostOk) {
    return "depreciation";
  }

  return "pending";
}

function stampForKind(
  kind: CommerceVerdictKind,
  isEstimated = false
): CommerceStampLabel {
  let base: CommerceStampLabel;
  switch (kind) {
    case "overpriced":
      base = "PASS";
      break;
    case "bargain":
      base = "CHECK";
      break;
    case "fair":
    case "depreciation":
      base = "HOLD";
      break;
    default:
      return "PENDING";
  }

  if (!isEstimated) {
    return base;
  }

  return `EST. ${base}` as CommerceStampLabel;
}

function accentForKind(kind: CommerceVerdictKind): CommerceVerdictAccent {
  switch (kind) {
    case "overpriced":
      return "rose";
    case "bargain":
      return "blue";
    case "fair":
    case "depreciation":
      return "amber";
    default:
      return "muted";
  }
}

function headlineForKind(kind: CommerceVerdictKind): string {
  switch (kind) {
    case "overpriced":
      return "구매 전 멈춤";
    case "bargain":
      return "시세 이하 확인";
    case "fair":
      return "적정 범위";
    case "depreciation":
      return "보유 손실 예상";
    default:
      return "시세 확인 중";
  }
}

function heroForKind(
  kind: CommerceVerdictKind,
  listingPrice: number | null,
  medianPrice: number | null,
  trueCost: TrueCostReceipt | null
): CommerceHeroMetric {
  if (kind === "pending") {
    return { signed: "~", amount: null, unit: "none" };
  }

  if (kind === "depreciation" && trueCost?.available) {
    return {
      signed: "~",
      amount: trueCost.netHoldCost,
      unit: "won_per_period",
      periodMonths: trueCost.holdMonths,
    };
  }

  if (kind === "fair") {
    const delta =
      listingPrice !== null && medianPrice !== null
        ? Math.abs(listingPrice - medianPrice)
        : null;

    if (delta !== null && delta > 0 && delta < MARKET_DELTA_THRESHOLD) {
      return { signed: "~", amount: delta, unit: "won" };
    }

    return { signed: "~", amount: null, unit: "none" };
  }

  if (
    listingPrice !== null &&
    medianPrice !== null &&
    medianPrice > 0
  ) {
    const delta = Math.abs(listingPrice - medianPrice);
    return {
      signed: kind === "overpriced" ? "+" : "-",
      amount: delta,
      unit: "won",
    };
  }

  return { signed: "~", amount: null, unit: "none" };
}

/** Loss-prevention subline — shared by L0 value_metric and receipt UI. */
export function buildCommerceVerdictSubline(
  input: CommerceVerdictInput,
  options?: { isEstimated?: boolean }
): string {
  const { listingPrice, medianPrice, verdict, trueCostOk, trueCost } =
    resolveListingAndMedian(input);
  const kind = resolveKind(input);
  const isEstimated = options?.isEstimated ?? false;

  if (isEstimated && listingPrice && medianPrice && medianPrice > 0) {
    const delta = Math.abs(listingPrice - medianPrice);
    if (delta >= MARKET_DELTA_THRESHOLD) {
      return `실시간 시세 지연 중 — AI 추정 ${formatShortWon(delta)}`;
    }
    return "실시간 시세 지연 중 — AI 추정가 참고";
  }
  if (listingPrice && medianPrice && medianPrice > 0) {
    const delta = listingPrice - medianPrice;
    if (delta >= MARKET_DELTA_THRESHOLD) {
      return `시세 대비 ${formatShortWon(delta)} 비쌈 — 안 사는 게 이득입니다.`;
    }

    if (delta <= -MARKET_DELTA_THRESHOLD) {
      return `시세 대비 ${formatShortWon(Math.abs(delta))} 저렴 — 놓치면 손해!`;
    }
  }

  if (verdict === "high") {
    return "시세 대비 높음(주의) — 비교 전 구매는 손해 가능";
  }

  if (verdict === "bargain") {
    return "시세 대비 저렴 — 지금 안 보면 놓칠 수 있음";
  }

  if (kind === "depreciation" && trueCostOk && trueCost) {
    return `${trueCost.holdMonths}개월 보유 시 약 ${formatShortWon(trueCost.netHoldCost)} 손실(감가) 예상.`;
  }

  if (verdict === "fair") {
    return "시세 적정 — 헛비교 시간만 줄이기";
  }

  if (listingPrice && listingPrice > 0) {
    return "시세 확인 전 구매 — 비교 안 하면 손해 가능";
  }

  return "시세 데이터 수집 중 — 판정 전 구매는 주의";
}

/**
 * Pure read-path projection for commerce receipt verdict UI + L0 subline.
 */
export function deriveCommerceVerdictPresentation(input: {
  market?: MarketPriceSnapshot | null;
  trueCost?: TrueCostReceipt | null;
}): CommerceVerdictPresentation | null {
  const market = input.market ?? null;
  const trueCost = input.trueCost ?? null;
  const marketOk = Boolean(market?.available);
  const trueCostOk = Boolean(trueCost?.available);

  if (!marketOk && !trueCostOk) {
    return null;
  }

  const kind = resolveKind({ market, trueCost });
  const isEstimated =
    isEstimatedMarketSnapshot(market) ||
    (!marketOk && trueCostOk);
  const { listingPrice, medianPrice, deltaPercent } = resolveListingAndMedian({
    market,
    trueCost,
  });

  const spectrumPosition =
    kind === "pending" || kind === "depreciation"
      ? kind === "depreciation" && deltaPercent !== null
        ? spectrumFromDeltaPercent(deltaPercent)
        : 50
      : spectrumFromDeltaPercent(deltaPercent);

  return {
    kind,
    stampLabel: stampForKind(kind, isEstimated),
    accent: accentForKind(kind),
    verdictHeadline: headlineForKind(kind),
    heroMetric: heroForKind(kind, listingPrice, medianPrice, trueCost),
    spectrumPosition,
    subline: buildCommerceVerdictSubline({ market, trueCost }, { isEstimated }),
    isEstimated,
  };
}

export function formatCommerceHeroMetric(metric: CommerceHeroMetric): string {
  if (metric.unit === "none" || metric.amount === null) {
    return "적정";
  }

  const formatted = formatSublineWon(metric.amount);

  if (metric.unit === "won_per_period") {
    const months = metric.periodMonths ?? 6;
    return `${formatted}/${months}mo`;
  }

  return `${metric.signed}${formatted}`;
}

export function commerceVerdictAccentClass(accent: CommerceVerdictAccent) {
  switch (accent) {
    case "rose":
      return "text-rose-600";
    case "blue":
      return "text-rimvio-neon-cyan";
    case "amber":
      return "text-amber-700";
    default:
      return "text-muted-foreground";
  }
}

export function commerceVerdictBarClass(accent: CommerceVerdictAccent) {
  switch (accent) {
    case "rose":
      return "bg-rose-500";
    case "blue":
      return "bg-rimvio-neon-purple";
    case "amber":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/30";
  }
}
