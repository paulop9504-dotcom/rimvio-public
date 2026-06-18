"use client";

import { CommerceReceiptCard } from "@/components/commerce-receipt-card";
import { StudyReceiptCard } from "@/components/study-receipt-card";
import { TimeReceiptCard } from "@/components/time-receipt";
import { FeedInsightCard } from "@/components/feed-insight-card";
import type { ReceiptRailItem } from "@/lib/action-chat/build-receipt-rail-items";
import { ACTION_CHAT } from "@/lib/ui/action-chat-theme";
import { cn } from "@/lib/utils";
import { Receipt, Sparkles } from "lucide-react";

function SpendReceiptCard({
  merchant,
  amountWon,
  headline,
}: {
  merchant: string;
  amountWon: number | null;
  headline: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#FFFBF5] ring-1 ring-[#E8D5B7]/60">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#7B61FF]/25 to-transparent" />
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7B4F]">
              지출 영수증
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-[#1F2937]">
              {merchant}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#7B61FF]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7B61FF]">
            OCR
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-dashed border-[#E8D5B7]/80 pt-2.5">
          <span className="text-[11px] text-[#6B7280]">합계</span>
          <span className="text-[18px] font-bold tabular-nums tracking-tight text-[#1F2937]">
            {amountWon != null ? `${headline}` : headline}
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-[#9CA3AF]">
          가계부·지출 앱에 기록하거나 검색해 보세요.
        </p>
      </div>
    </div>
  );
}

function ReceiptRailCard({ item }: { item: ReceiptRailItem }) {
  if (item.kind === "spend") {
    return (
      <SpendReceiptCard
        merchant={item.merchant}
        amountWon={item.amountWon}
        headline={item.headline}
      />
    );
  }

  if (item.kind === "study") {
    return <StudyReceiptCard receipt={item.receipt} compact />;
  }

  if (item.kind === "time") {
    return <TimeReceiptCard receipt={item.receipt} loading={item.loading} />;
  }

  if (item.kind === "commerce") {
    return (
      <CommerceReceiptCard
        market={item.market}
        trueCost={item.trueCost}
        marketLoading={item.marketLoading}
        linkId={item.linkId}
        compact
      />
    );
  }

  return (
    <FeedInsightCard
      kind="save"
      link={item.link}
      docked={false}
      primaryActionLabel={item.primaryActionLabel}
      signalLine={item.signalLine}
    />
  );
}

type ActionChatReceiptRailProps = {
  items: ReceiptRailItem[];
  loading?: boolean;
  className?: string;
};

export function ActionChatReceiptRail({
  items,
  loading = false,
  className,
}: ActionChatReceiptRailProps) {
  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 px-0.5">
        <span
          className="flex size-5 items-center justify-center rounded-md"
          style={{ backgroundColor: `${ACTION_CHAT.accent}14`, color: ACTION_CHAT.accent }}
        >
          <Receipt className="size-3" strokeWidth={2.2} />
        </span>
        <span className="text-[11px] font-semibold text-[#6B7280]">
          {loading ? "영수증 불러오는 중…" : "함께 보면 좋아요"}
        </span>
        {!loading && items.length > 1 ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-[#9CA3AF]">
            <Sparkles className="size-3 text-[#7B61FF]" />
            {items.length}개
          </span>
        ) : null}
      </div>

      <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading && items.length === 0 ? (
          <div className="min-w-[88%] shrink-0 snap-start rounded-2xl bg-white/80 px-3 py-4 ring-1 ring-black/[0.04]">
            <div className="h-3 w-24 animate-pulse rounded bg-[#EDE9FE]" />
            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-[#F3F4F6]" />
          </div>
        ) : null}
        {items.map((item, index) => (
          <div
            key={`${item.kind}-${index}`}
            className={cn(
              "shrink-0 snap-start",
              items.length === 1 ? "w-full" : "min-w-[88%] max-w-[92%]"
            )}
          >
            <ReceiptRailCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
