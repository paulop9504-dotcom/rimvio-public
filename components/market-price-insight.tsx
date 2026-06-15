"use client";

import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import { cn } from "@/lib/utils";

const VERDICT_STYLE: Record<
  MarketPriceSnapshot["verdict"],
  { ring: string; badge: string; text: string }
> = {
  bargain: {
    ring: "ring-emerald-500/20 bg-emerald-500/[0.06]",
    badge: "bg-emerald-500/12 text-emerald-700",
    text: "협상 여지",
  },
  fair: {
    ring: "ring-sky-500/20 bg-sky-500/[0.06]",
    badge: "bg-sky-500/12 text-sky-700",
    text: "적정 범위",
  },
  high: {
    ring: "ring-rose-500/20 bg-rose-500/[0.06]",
    badge: "bg-rose-500/12 text-rose-700",
    text: "시세 대비 높음",
  },
  unknown: {
    ring: "ring-black/[0.06] bg-[#f8f8fa]",
    badge: "bg-[#eef0f4] text-muted-foreground",
    text: "참고 중",
  },
};

function confidenceLabel(confidence: MarketPriceSnapshot["confidence"]) {
  if (confidence === "high") {
    return "신뢰도 높음";
  }

  if (confidence === "medium") {
    return "신뢰도 보통";
  }

  return "표본 적음";
}

export function MarketPriceInsight({
  snapshot,
  loading,
}: {
  snapshot: MarketPriceSnapshot | null;
  loading?: boolean;
}) {
  if (!loading && snapshot && !snapshot.available) {
    return null;
  }

  if (loading && !snapshot) {
    return (
      <div className="rounded-2xl bg-[#f8f8fa] px-3 py-2.5 text-center text-[11px] text-muted-foreground ring-1 ring-black/[0.04]">
        시세 비교 계산 중…
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const style = VERDICT_STYLE[snapshot.verdict];

  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2.5 ring-1",
        style.ring
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-[12px] font-semibold leading-snug text-foreground">
            {snapshot.headline}
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {snapshot.detail}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            style.badge
          )}
        >
          {style.text}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-muted-foreground ring-1 ring-black/[0.05]">
          {confidenceLabel(snapshot.confidence)}
        </span>
        {snapshot.query ? (
          <span className="truncate text-[10px] text-muted-foreground">
            검색어 · {snapshot.query}
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground/80">
        {snapshot.disclaimer}
      </p>
    </div>
  );
}
