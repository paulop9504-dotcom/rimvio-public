"use client";

import { FeedInsightCard } from "@/components/feed-insight-card";
import type { ReceiptPeekKind } from "@/lib/feed/resolve-receipt-peek";
import type { MarketPriceSnapshot } from "@/lib/commerce/market-price";
import type { TimeReceipt } from "@/lib/media/time-receipt";
import type { TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import type { StudyReceipt } from "@/lib/study/build-study-receipt";
import type { LinkRow } from "@/types/database";

type FeedReceiptPeekProps = {
  kind: ReceiptPeekKind;
  link: LinkRow;
  primaryActionLabel?: string | null;
  signalLine?: string | null;
  timeReceipt?: TimeReceipt | null;
  marketSnapshot?: MarketPriceSnapshot | null;
  trueCostReceipt?: TrueCostReceipt | null;
  studyReceipt?: StudyReceipt | null;
  overlay?: boolean;
  className?: string;
};

export function FeedReceiptPeek({
  kind,
  link,
  primaryActionLabel,
  signalLine,
  timeReceipt,
  marketSnapshot,
  trueCostReceipt,
  studyReceipt,
  overlay = false,
  className,
}: FeedReceiptPeekProps) {
  if (kind === "study") {
    return (
      <FeedInsightCard
        kind="study"
        link={link}
        overlay={overlay}
        compact
        studyReceipt={studyReceipt}
        className={className}
      />
    );
  }

  if (kind === "truecost" || kind === "market") {
    return (
      <FeedInsightCard
        kind="commerce"
        link={link}
        overlay={overlay}
        compact
        marketSnapshot={marketSnapshot}
        trueCostReceipt={trueCostReceipt}
        className={className}
      />
    );
  }

  if (kind === "time") {
    return (
      <FeedInsightCard
        kind="time"
        link={link}
        overlay={overlay}
        timeReceipt={timeReceipt}
        className={className}
      />
    );
  }

  return (
    <FeedInsightCard
      kind="save"
      link={link}
      overlay={overlay}
      primaryActionLabel={primaryActionLabel}
      signalLine={signalLine}
      className={className}
    />
  );
}
