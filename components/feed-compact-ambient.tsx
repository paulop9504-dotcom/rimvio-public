"use client";

import { FeedAmbientPoster } from "@/components/feed-ambient-poster";
import { FeedInsightCard } from "@/components/feed-insight-card";
import { hasCompactAmbientPoster } from "@/lib/feed/resolve-compact-ambient-poster";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import type { TimeReceipt } from "@/lib/media/time-receipt";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import type { StudyReceipt } from "@/lib/study/build-study-receipt";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type FeedCompactAmbientProps = {
  link: LinkRow;
  primaryActionLabel?: string | null;
  showTime?: boolean;
  timeReceipt?: TimeReceipt | null;
  timeLoading?: boolean;
  showMarket?: boolean;
  marketSnapshot?: MarketPriceSnapshot | null;
  marketLoading?: boolean;
  showTrueCost?: boolean;
  trueCostReceipt?: TrueCostReceipt | null;
  showStudy?: boolean;
  studyReceipt?: StudyReceipt | null;
  active?: boolean;
  onReceiptDefer?: (timing: {
    dwell_time_ms: number;
    time_to_action_ms: number;
  }) => void;
};

function InsightBody(props: FeedCompactAmbientProps) {
  const {
    showStudy,
    studyReceipt,
    showMarket,
    showTrueCost,
    marketSnapshot,
    trueCostReceipt,
    marketLoading,
    showTime,
    timeReceipt,
    timeLoading,
    link,
    active,
    onReceiptDefer,
  } = props;

  if (showStudy && studyReceipt?.available) {
    return (
      <FeedInsightCard
        kind="study"
        link={link}
        studyReceipt={studyReceipt}
      />
    );
  }

  if (showMarket || showTrueCost) {
    return (
      <FeedInsightCard
        kind="commerce"
        link={link}
        compact
        marketSnapshot={marketSnapshot}
        trueCostReceipt={trueCostReceipt}
        marketLoading={marketLoading}
        active={active}
        onReceiptDefer={onReceiptDefer}
      />
    );
  }

  if (showTime && (timeLoading || timeReceipt?.available)) {
    return (
      <FeedInsightCard
        kind="time"
        link={link}
        timeReceipt={timeReceipt}
        timeLoading={timeLoading}
      />
    );
  }

  return null;
}

/** Compact card top zone — poster + receipt paper (시간/시세/저장 영수증). */
export function FeedCompactAmbient(props: FeedCompactAmbientProps) {
  const poster = hasCompactAmbientPoster(props.link)
    ? props.link.thumbnail_url!.trim()
    : null;

  return (
    <div
      className={cn(
        "relative min-h-[9.5rem] flex-1 overflow-hidden rounded-[22px]",
        "ring-1 ring-black/[0.04]",
        !poster && "bg-[#eef0f4]"
      )}
    >
      {poster ? <FeedAmbientPoster src={poster} /> : null}

      <div className="relative z-10 flex h-full min-h-[9.5rem] items-end p-3">
        <div className="w-full">
          <InsightBody {...props} />
        </div>
      </div>
    </div>
  );
}
