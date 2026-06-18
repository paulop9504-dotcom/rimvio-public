"use client";

import { memo } from "react";
import { ChevronRight } from "lucide-react";
import { formatExperienceAxisChips } from "@/lib/experience-graph/format-experience-axis";
import {
  formatExperienceLensChip,
  formatExperienceTypeChip,
} from "@/lib/experience-graph/format-experience-lens";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

export type FeedExperienceAxisBreadcrumbProps = {
  volume: ExperienceVolume;
  onOpenPlayer?: () => void;
  className?: string;
};

/** 카드 상단 — 대 › 중 › 소 한 줄 (기존 다중 칩 대체). */
export const FeedExperienceAxisBreadcrumb = memo(function FeedExperienceAxisBreadcrumb({
  volume,
  onOpenPlayer,
  className,
}: FeedExperienceAxisBreadcrumbProps) {
  const copy = useCopy();
  const typeChip = formatExperienceTypeChip(volume.eventType);
  const lensChip = formatExperienceLensChip({
    eventType: volume.eventType,
    lens: volume.activeLens,
  });
  const axisChips = formatExperienceAxisChips(volume);
  const placeLabel =
    axisChips.find((chip) => chip.axis === "space")?.label.replace(/^공간 · /, "") ||
    volume.space.label.trim() ||
    "장소";

  const crumbs = [typeChip.label, lensChip.label, placeLabel];

  const body = (
    <>
      <span className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
        {crumbs.map((label, index) => (
          <span key={`${label}-${index}`}>
            {index > 0 ? (
              <ChevronRight
                className="mx-0.5 inline size-3 -translate-y-px text-muted-foreground/50"
                aria-hidden
              />
            ) : null}
            <span className={index === 0 ? "text-foreground" : undefined}>{label}</span>
          </span>
        ))}
      </span>
      {onOpenPlayer ? (
        <span className="ml-2 shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {copy.feed.experience.recallChip}
        </span>
      ) : null}
    </>
  );

  if (onOpenPlayer) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-center text-left",
          className,
        )}
        data-feed-experience-breadcrumb
        data-experience-volume-id={volume.id}
        onClick={onOpenPlayer}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={cn("flex w-full items-center", className)}
      data-feed-experience-breadcrumb
      data-experience-volume-id={volume.id}
    >
      {body}
    </div>
  );
});
