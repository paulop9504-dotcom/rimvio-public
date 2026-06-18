"use client";

import Link from "next/link";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type RimvioProductContextStripProps = {
  variant: "feed" | "peers";
  className?: string;
  /** peers 빈 허브 — 실행 탭 링크 */
  showFeedLink?: boolean;
  /** feed 헤더 — 로고·아이콘 아래 한 줄 (겹침 방지) */
  layout?: "card" | "header";
};

export function RimvioProductContextStrip({
  variant,
  className,
  showFeedLink = false,
  layout = "card",
}: RimvioProductContextStripProps) {
  const copy = useCopy();
  const line =
    variant === "feed" ? copy.product.feedContext : copy.product.peersContext;

  const lightSurface = variant === "peers";

  if (layout === "header") {
    return (
      <div className={cn("min-w-0 pr-1", className)}>
        <p
          className={cn(
            "truncate text-[11px] font-medium leading-snug",
            lightSurface ? "text-[#191f28]" : "text-white/72",
          )}
        >
          {line}
        </p>
        <p
          className={cn(
            "mt-0.5 hidden text-[10px] leading-snug min-[360px]:line-clamp-1 min-[360px]:block",
            lightSurface ? "text-[#6b7684]" : "text-white/38",
          )}
        >
          {copy.product.oneLinerSub}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2.5 text-center",
        lightSurface
          ? "border border-[#0220470f] bg-[#f2f4f6]/90"
          : "border border-white/[0.08] bg-white/[0.04]",
        className,
      )}
    >
      <p
        className={cn(
          "text-[12px] font-medium leading-snug",
          lightSurface ? "text-[#191f28]" : "text-white/75",
        )}
      >
        {line}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[10px]",
          lightSurface ? "text-[#6b7684]" : "text-white/40",
        )}
      >
        {copy.product.oneLinerSub}
      </p>
      {showFeedLink ? (
        <Link
          href="/feed"
          className="mt-1.5 inline-block text-[11px] font-medium text-rimvio-neon-cyan"
        >
          {copy.peers.emptyFeedLink} →
        </Link>
      ) : null}
    </div>
  );
}
