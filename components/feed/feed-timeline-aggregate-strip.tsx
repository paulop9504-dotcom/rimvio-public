"use client";

import { memo } from "react";
import type { FeedTimelineAggregate } from "@/lib/feed/feed-timeline-aggregate-types";
import { formatFeedTimelineAggregateChips } from "@/lib/feed/format-feed-timeline-aggregate";
import { cn } from "@/lib/utils";

type FeedTimelineAggregateStripProps = {
  aggregate: FeedTimelineAggregate;
  className?: string;
};

/** Timeline stats row — captures, dwell, friends, links on Feed slot cards. */
export const FeedTimelineAggregateStrip = memo(function FeedTimelineAggregateStrip({
  aggregate,
  className,
}: FeedTimelineAggregateStripProps) {
  const chips = formatFeedTimelineAggregateChips(aggregate);
  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      data-feed-timeline-aggregate
      aria-label="오늘 모인 기록"
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          data-feed-timeline-chip={chip.id}
          className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/72 ring-1 ring-white/[0.08]"
        >
          {chip.emoji ? <span aria-hidden>{chip.emoji}</span> : null}
          {chip.label}
        </span>
      ))}
    </div>
  );
});
