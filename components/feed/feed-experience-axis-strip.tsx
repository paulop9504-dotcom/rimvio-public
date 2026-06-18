"use client";

import { memo } from "react";
import { formatExperienceAxisChips } from "@/lib/experience-graph/format-experience-axis";
import {
  formatExperienceLensChip,
  formatExperienceTypeChip,
} from "@/lib/experience-graph/format-experience-lens";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { cn } from "@/lib/utils";

export type FeedExperienceAxisStripProps = {
  volume: ExperienceVolume;
  onOpenPlayer?: () => void;
  className?: string;
};

const AXIS_TONE = {
  time: "border-violet-400/30 bg-violet-500/10 text-violet-100/90",
  map: "border-sky-400/30 bg-sky-500/10 text-sky-100/90",
  space: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90",
} as const;

const META_TONE = {
  type: "border-white/20 bg-white/[0.06] text-white/75",
  lens: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100/90",
} as const;

/** Time · Map · Space — 3-axis search entry on feed cards. */
export const FeedExperienceAxisStrip = memo(function FeedExperienceAxisStrip({
  volume,
  onOpenPlayer,
  className,
}: FeedExperienceAxisStripProps) {
  const typeChip = formatExperienceTypeChip(volume.eventType);
  const lensChip = formatExperienceLensChip({
    eventType: volume.eventType,
    lens: volume.activeLens,
  });
  const chips = formatExperienceAxisChips(volume);

  const row = (
    <>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
          META_TONE.type,
        )}
        data-feed-experience-type
      >
        {typeChip.emoji ? `${typeChip.emoji} ` : ""}
        {typeChip.label}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
          META_TONE.lens,
        )}
        data-feed-experience-lens
      >
        {lensChip.label}
      </span>
      {chips.map((chip) => (
        <span
          key={chip.axis}
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            AXIS_TONE[chip.axis],
          )}
          data-feed-experience-axis-kind={chip.axis}
        >
          {chip.label}
        </span>
      ))}
      {onOpenPlayer ? (
        <span
          className="ml-auto shrink-0 rounded-full border border-sky-300/35 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-100/95"
          data-feed-open-globe-recall
        >
          그때 거기
        </span>
      ) : null}
    </>
  );

  if (onOpenPlayer) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full gap-1 overflow-x-auto text-left [scrollbar-width:none]",
          className,
        )}
        data-feed-experience-axis
        data-experience-volume-id={volume.id}
        data-experience-event-type={volume.eventType}
        data-experience-lens={volume.activeLens}
        onClick={onOpenPlayer}
      >
        {row}
      </button>
    );
  }

  return (
    <div
      className={cn("flex gap-1 overflow-x-auto [scrollbar-width:none]", className)}
      data-feed-experience-axis
      data-experience-volume-id={volume.id}
      data-experience-event-type={volume.eventType}
      data-experience-lens={volume.activeLens}
    >
      {row}
    </div>
  );
});
