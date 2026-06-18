"use client";

import { memo } from "react";
import { FEED_EXPERIENCE_RUN_MENTIONS } from "@/lib/feed/feed-experience-run-mentions";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type FeedExperienceRunChipsProps = {
  deferred: boolean;
  onRun: (featureId: string) => void;
  compact?: boolean;
  className?: string;
};

export const FeedExperienceRunChips = memo(function FeedExperienceRunChips({
  deferred,
  onRun,
  compact = false,
  className,
}: FeedExperienceRunChipsProps) {
  const copy = useCopy();
  const runCopy = copy.feed.experience.run;

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-feed-experience-run-chips
      data-feed-run-deferred={deferred ? "true" : "false"}
    >
      {!compact ? (
        <p className="text-[11px] font-medium text-white/38">{runCopy.sectionLabel}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {FEED_EXPERIENCE_RUN_MENTIONS.map((mention) => (
          <button
            key={mention.featureId}
            type="button"
            disabled={deferred}
            data-feed-run-mention={mention.featureId}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]",
              deferred
                ? "cursor-not-allowed bg-white/[0.04] text-white/28 ring-1 ring-white/[0.06]"
                : "bg-violet-500/18 text-violet-100/92 ring-1 ring-violet-300/30 hover:bg-violet-500/26",
            )}
            onClick={() => onRun(mention.featureId)}
          >
            @{mention.label}
          </button>
        ))}
      </div>
      {deferred ? (
        <p className="text-[11px] leading-snug text-white/35">{copy.feed.experience.verifyDeferHint}</p>
      ) : (
        <p className="text-[11px] leading-snug text-white/35">{runCopy.hint}</p>
      )}
    </div>
  );
});
