import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import {
  deriveCommerceVerdictPresentation,
  type CommerceVerdictPresentation,
} from "@/lib/commerce/commerce-verdict-presentation";

export type UnifiedCommerceLineTone = "neutral" | "minus" | "accent";

export type UnifiedCommerceLine = {
  icon: string;
  label: string;
  value: string;
  tone?: UnifiedCommerceLineTone;
  dividerBefore?: boolean;
};

export type UnifiedCommerceReceipt = {
  available: boolean;
  headline: string;
  badge: string | null;
  verdictLabel: string | null;
  verdict: CommerceVerdictPresentation | null;
  lines: UnifiedCommerceLine[];
  footer: string;
};

function formatWon(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function verdictLabel(verdict: MarketPriceSnapshot["verdict"], deltaPercent: number | null) {
  switch (verdict) {
    case "bargain":
      return deltaPercent !== null
        ? `시세 대비 ${Math.abs(deltaPercent)}% 낮음`
        : "협상 여지";
    case "fair":
      return "적정 범위";
    case "high":
      return deltaPercent !== null
        ? `시세 대비 ${deltaPercent}% 높음`
        : "시세 대비 높음";
    default:
      return "시세 참고 중";
  }
}

function marketVerdictBadge(snapshot: MarketPriceSnapshot) {
  switch (snapshot.verdict) {
    case "bargain":
      return "협상 여지";
    case "fair":
      return "적정";
    case "high":
      return "높음";
    default:
      return "참고 중";
  }
}

/**
 * Merge market snapshot + true-cost into one receipt — essential lines only.
 * Pure read path.
 */
export function buildUnifiedCommerceReceipt(input: {
  market?: MarketPriceSnapshot | null;
  trueCost?: TrueCostReceipt | null;
}): UnifiedCommerceReceipt {
  const market = input.market ?? null;
  const trueCost = input.trueCost ?? null;
  const marketOk = Boolean(market?.available);
  const trueCostOk = Boolean(trueCost?.available);

  if (!marketOk && !trueCostOk) {
    return {
      available: false,
      headline: "중고 영수증 준비 중",
      badge: null,
      verdictLabel: null,
      verdict: null,
      lines: [],
      footer: "참고용 · 거래 전 직접 확인하세요.",
    };
  }

  const verdictPresentation = deriveCommerceVerdictPresentation({ market, trueCost });

  const listingPrice =
    trueCost?.surfacePrice ?? market?.listingPrice ?? null;
  const listingLabel = formatWon(listingPrice);

  const headline = verdictPresentation?.verdictHeadline
    ?? (trueCostOk
      ? trueCost!.headline
      : market?.headline ?? (listingLabel ? `${listingLabel} · 시세 확인` : "중고 매물"));

  const badge = trueCostOk ? trueCost!.deviceLabel : null;
  const verdictLabelText = marketOk ? marketVerdictBadge(market!) : null;

  const lines: UnifiedCommerceLine[] = [];

  if (marketOk && market!.verdict !== "unknown") {
    lines.push({
      icon: "📊",
      label: "시세",
      value: verdictLabel(market!.verdict, market!.deltaPercent),
      tone: market!.verdict === "high" ? "minus" : market!.verdict === "bargain" ? "accent" : "neutral",
    });

    const medianLabel = formatWon(market!.median);
    if (medianLabel) {
      lines.push({
        icon: "📎",
        label: "유사 매물 중앙값",
        value: medianLabel,
      });
    }
  } else if (marketOk && listingLabel) {
    lines.push({
      icon: "📊",
      label: "시세",
      value: "쇼핑몰 비교 · 표본 적음",
    });
  }

  if (trueCostOk) {
    const depreciation = trueCost!.lines.find((line) => line.kind === "depreciation");
    if (depreciation) {
      lines.push({
        icon: depreciation.icon,
        label: `${trueCost!.holdMonths}개월 예상 감가`,
        value: `- ${formatWon(depreciation.amount) ?? ""}`.trim(),
        tone: "minus",
        dividerBefore: lines.length > 0,
      });
    }

    lines.push({
      icon: "💡",
      label: `월 사용료 · ${trueCost!.holdMonths}개월 순보유`,
      value: `${formatWon(trueCost!.monthlyHoldCost)} · ${formatWon(trueCost!.netHoldCost)}`,
      tone: "accent",
    });

    const resaleLabel = formatWon(trueCost!.expectedResalePrice);
    if (resaleLabel) {
      lines.push({
        icon: "↩️",
        label: `${trueCost!.holdMonths}개월 뒤 되팔기 예상`,
        value: resaleLabel,
      });
    }
  } else if (listingLabel) {
    lines.push({
      icon: "🏷️",
      label: "매물가",
      value: listingLabel,
    });
  }

  const footer = trueCostOk
    ? "참고용 추정 · 상태·시세에 따라 달라질 수 있어요."
    : market?.disclaimer ?? "참고용 · 거래 전 직접 확인하세요.";

  return {
    available: true,
    headline,
    badge,
    verdictLabel: verdictLabelText,
    verdict: verdictPresentation,
    lines,
    footer,
  };
}

export function shouldShowUnifiedCommerceReceipt(input: {
  market?: MarketPriceSnapshot | null;
  trueCost?: TrueCostReceipt | null;
  marketLoading?: boolean;
}) {
  if (input.marketLoading && !input.market && !input.trueCost?.available) {
    return true;
  }

  return Boolean(
    input.trueCost?.available ||
      input.market?.available ||
      (input.marketLoading && input.market === null)
  );
}
