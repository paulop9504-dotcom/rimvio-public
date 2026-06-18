"use client";

import { Users, X } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { GatheringTraceHint } from "@/lib/globe/resolve-gathering-trace-hint";
import { cn } from "@/lib/utils";

export type GlobeGatheringTraceCardProps = {
  hint: GatheringTraceHint | null;
  onDismiss: () => void;
  className?: string;
};

/** P3 — light hint after a gathering trace commit (no RSVP / chat). */
export function GlobeGatheringTraceCard({
  hint,
  onDismiss,
  className,
}: GlobeGatheringTraceCardProps) {
  if (!hint) {
    return null;
  }

  const { slots } = hint;

  return (
    <div
      className={cn(
        "rounded-[1.15rem] border border-border bg-card/95 p-3.5 shadow-sm ring-1 ring-black/5 backdrop-blur-md",
        className,
      )}
      data-globe-gathering-trace-card
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {copy.globe.gatheringTraceEyebrow}
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground">
            {copy.globe.gatheringTraceTitle}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {copy.globe.gatheringTraceBody}
          </p>
          {hint.lineageParentEventId ? (
            <p className="mt-1.5 text-[11px] font-medium text-foreground/70">
              {copy.globe.gatheringTraceLineage}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {typeof slots.headcountHint === "number" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                <Users className="size-3" aria-hidden />
                {copy.globe.gatheringHeadcountHint(slots.headcountHint)}
              </span>
            ) : null}
            {slots.timeHint ? (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                {copy.globe.gatheringTimeHint(slots.timeHint)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground active:scale-95"
          aria-label="닫기"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
