"use client";

import { CommerceReceiptCard } from "@/components/commerce-receipt-card";
import { InsightReceiptDock } from "@/components/insight-receipt-dock";
import { StudyReceiptCard } from "@/components/study-receipt-card";
import { TimeReceiptCard } from "@/components/time-receipt";
import { shouldShowUnifiedCommerceReceipt } from "@/lib/commerce/unified-commerce-receipt";
import { buildSaveReceipt } from "@/lib/feed/build-save-receipt";
import {
  commerceInsightDockLabel,
  insightDockAccentForKind,
  insightDockCollapseLabel,
  saveInsightDockLabel,
  studyInsightDockLabel,
  timeInsightDockLabel,
} from "@/lib/feed/insight-dock-label";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import type { TimeReceipt } from "@/lib/media/time-receipt";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import type { StudyReceipt } from "@/lib/study/build-study-receipt";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

export type FeedInsightKind = "study" | "commerce" | "time" | "save";

type FeedInsightCardProps = {
  kind: FeedInsightKind;
  link: LinkRow;
  overlay?: boolean;
  compact?: boolean;
  docked?: boolean;
  studyReceipt?: StudyReceipt | null;
  marketSnapshot?: MarketPriceSnapshot | null;
  trueCostReceipt?: TrueCostReceipt | null;
  marketLoading?: boolean;
  timeReceipt?: TimeReceipt | null;
  timeLoading?: boolean;
  primaryActionLabel?: string | null;
  signalLine?: string | null;
  active?: boolean;
  onReceiptDefer?: (timing: {
    dwell_time_ms: number;
    time_to_action_ms: number;
  }) => void;
  className?: string;
};

function SaveReceiptPeek({
  link,
  primaryActionLabel,
  signalLine,
  overlay,
  className,
}: {
  link: LinkRow;
  primaryActionLabel?: string | null;
  signalLine?: string | null;
  overlay?: boolean;
  className?: string;
}) {
  const save = buildSaveReceipt(link, primaryActionLabel);
  const tease = /true\s*cost|진짜\s*영수증/i.test(signalLine ?? "")
    ? "6개월 보유비용 — 한번 확인해 보세요"
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2.5",
        overlay
          ? "bg-black/45 text-white ring-1 ring-white/20 backdrop-blur-md"
          : "bg-[#fffdf8] ring-1 ring-black/[0.06]",
        className
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.22em]",
          overlay ? "text-white/70" : "text-foreground/50"
        )}
      >
        저장 영수증
      </p>
      <p
        className={cn(
          "mt-1 text-[12px] font-semibold leading-snug",
          overlay ? "text-white" : "text-foreground"
        )}
      >
        {save.title}
      </p>
      <p
        className={cn(
          "mt-0.5 line-clamp-2 text-[11px] leading-snug",
          overlay ? "text-white/78" : "text-muted-foreground"
        )}
      >
        {tease ??
          `${save.siteLabel}${save.categoryLabel ? ` · ${save.categoryLabel}` : ""} · ${save.savedLabel}`}
      </p>
    </div>
  );
}

function insightHasContent(props: FeedInsightCardProps) {
  const { kind, studyReceipt, marketSnapshot, trueCostReceipt, marketLoading, timeReceipt, timeLoading } =
    props;

  switch (kind) {
    case "study":
      return Boolean(studyReceipt?.available);
    case "commerce":
      return shouldShowUnifiedCommerceReceipt({
        market: marketSnapshot,
        trueCost: trueCostReceipt,
        marketLoading,
      });
    case "time":
      return Boolean(timeLoading || timeReceipt?.available);
    default:
      return true;
  }
}

function FeedInsightCardBody(props: FeedInsightCardProps) {
  const {
    kind,
    link,
    overlay,
    compact,
    studyReceipt,
    marketSnapshot,
    trueCostReceipt,
    marketLoading,
    timeReceipt,
    timeLoading,
    primaryActionLabel,
    signalLine,
    active,
    onReceiptDefer,
    className,
  } = props;

  if (kind === "study") {
    if (!studyReceipt?.available) {
      return null;
    }

    return <StudyReceiptCard receipt={studyReceipt} compact={compact} />;
  }

  if (kind === "commerce") {
    if (
      !shouldShowUnifiedCommerceReceipt({
        market: marketSnapshot,
        trueCost: trueCostReceipt,
        marketLoading,
      })
    ) {
      return null;
    }

    return (
      <CommerceReceiptCard
        market={marketSnapshot ?? null}
        trueCost={trueCostReceipt ?? null}
        marketLoading={marketLoading}
        linkId={link.id}
        active={active}
        compact={compact}
        onDefer={onReceiptDefer}
      />
    );
  }

  if (kind === "time") {
    if (!timeLoading && !timeReceipt?.available) {
      return null;
    }

    return (
      <TimeReceiptCard receipt={timeReceipt ?? null} loading={timeLoading} />
    );
  }

  return (
    <SaveReceiptPeek
      link={link}
      primaryActionLabel={primaryActionLabel}
      signalLine={signalLine}
      overlay={overlay}
      className={className}
    />
  );
}

function resolveDockLabel(props: FeedInsightCardProps) {
  const {
    kind,
    link,
    studyReceipt,
    marketSnapshot,
    trueCostReceipt,
    timeReceipt,
    primaryActionLabel,
  } = props;

  switch (kind) {
    case "study":
      return studyReceipt?.available
        ? studyInsightDockLabel(studyReceipt)
        : "시험 포스트잇";
    case "commerce":
      return commerceInsightDockLabel({
        market: marketSnapshot,
        trueCost: trueCostReceipt,
      });
    case "time":
      return timeReceipt?.available
        ? timeInsightDockLabel(timeReceipt)
        : "시간 영수증 · 계산 중";
    default:
      return saveInsightDockLabel(link, primaryActionLabel);
  }
}

/** Unified feed insight card with optional dock collapse. */
export function FeedInsightCard(props: FeedInsightCardProps) {
  const { kind, docked = true, overlay = false } = props;

  if (!insightHasContent(props)) {
    return null;
  }

  const body = <FeedInsightCardBody {...props} />;

  if (!docked) {
    return body;
  }

  return (
    <InsightReceiptDock
      dockLabel={resolveDockLabel(props)}
      collapseLabel={insightDockCollapseLabel({ kind, overlay })}
      accent={insightDockAccentForKind(kind)}
      overlay={overlay}
    >
      {body}
    </InsightReceiptDock>
  );
}
