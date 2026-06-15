"use client";

import { Check } from "lucide-react";
import { buildFeedCaptureVerifyLabel } from "@/lib/feed/feed-capture-metadata";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { cn } from "@/lib/utils";

type FeedCaptureVerifyChipProps = {
  event: EventCandidate;
  onVerify: () => void;
  className?: string;
};

/** Hero CTA — one tap confirms auto-attached captures. */
export function FeedCaptureVerifyChip({
  event,
  onVerify,
  className,
}: FeedCaptureVerifyChipProps) {
  return (
    <button
      type="button"
      data-feed-capture-verify
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-2.5 text-[13px] font-semibold text-emerald-100 ring-1 ring-emerald-400/35 transition active:scale-[0.98] hover:bg-emerald-500/28",
        className,
      )}
      onClick={(eventClick) => {
        eventClick.stopPropagation();
        onVerify();
      }}
    >
      <Check className="size-3.5 shrink-0" aria-hidden />
      {buildFeedCaptureVerifyLabel(event)}
    </button>
  );
}
