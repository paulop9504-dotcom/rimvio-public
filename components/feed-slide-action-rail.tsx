"use client";

import { RefreshCw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedSlideActionRailProps = {
  hasMultipleActions: boolean;
  hidden?: boolean;
  onShare: () => void;
  onNextAction: () => void;
};

/** iOS-style floating action chips ??icon only */
export function FeedSlideActionRail({
  hasMultipleActions,
  hidden = false,
  onShare,
  onNextAction,
}: FeedSlideActionRailProps) {
  const chipClass = cn(
    "flex size-10 items-center justify-center rounded-full",
    "bg-rimvio-surface/88 text-foreground/85 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.18)]",
    "ring-1 ring-rimvio-neon-purple/15 backdrop-blur-xl",
    "transition-transform active:scale-95"
  );

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 right-0 z-30 w-14 transition-opacity duration-200",
        hidden && "pointer-events-none opacity-0"
      )}
      aria-hidden={hidden}
    >
      <div className="pointer-events-auto absolute right-2.5 top-[40%] flex -translate-y-1/2 flex-col gap-3">
        <button type="button" aria-label="링크 공유" onClick={onShare} className={chipClass}>
          <Share2 className="size-[1.15rem]" strokeWidth={2} />
        </button>

        {hasMultipleActions ? (
          <button
            type="button"
            aria-label="?�음 ?�동"
            onClick={onNextAction}
            className={chipClass}
          >
            <RefreshCw className="size-[1.15rem]" strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
