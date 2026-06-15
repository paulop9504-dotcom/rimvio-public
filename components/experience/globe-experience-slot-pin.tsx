"use client";

import { memo } from "react";
import { Lock } from "lucide-react";
import type { GlobePinSlotMeta } from "@/lib/feed/experience-globe-ping-types";
import { cn } from "@/lib/utils";

export type GlobeExperienceSlotPinProps = {
  slot: GlobePinSlotMeta;
  active?: boolean;
  related?: boolean;
  className?: string;
};

/** 2.5D stack slot — photo/video depth on globe. */
export const GlobeExperienceSlotPin = memo(function GlobeExperienceSlotPin({
  slot,
  active = false,
  related = false,
  className,
}: GlobeExperienceSlotPinProps) {
  const hasMedia = slot.photoCount > 0 || slot.videoCount > 0;

  return (
    <div
      className={cn(
        "relative transition-all duration-500",
        related ? "opacity-55" : "opacity-100",
        active ? "scale-110" : "scale-100 hover:scale-105",
        className,
      )}
      data-globe-slot-pin
      data-globe-slot-active={active ? "true" : "false"}
    >
      <div
        className={cn(
          "absolute -left-0.5 -top-1 h-[calc(100%-4px)] w-[calc(100%-2px)] rounded-lg bg-white/8 shadow-sm",
          "translate-x-[3px] translate-y-[3px] rotate-[-2deg]",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "absolute -left-0.5 -top-0.5 h-[calc(100%-6px)] w-[calc(100%-4px)] rounded-lg bg-white/10 shadow-sm",
          "translate-x-[1.5px] translate-y-[1.5px] rotate-[1deg]",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "relative min-w-[52px] max-w-[72px] rounded-lg border px-1.5 py-1 shadow-[0_8px_20px_rgba(0,0,0,0.35)]",
          active
            ? "border-primary/40 bg-white ring-2 ring-primary/30"
            : "border-border bg-white/95",
        )}
      >
        <p className="line-clamp-2 text-[8px] font-bold leading-tight text-foreground">
          {slot.experienceTitle}
        </p>
        {hasMedia ? (
          <div className="mt-1 flex flex-wrap gap-0.5">
            {slot.photoCount > 0 ? (
              <span className="rounded bg-[var(--rimvio-highlight-green)]/15 px-1 py-px text-[7px] font-bold text-foreground">
                📷{slot.photoCount > 99 ? "99+" : slot.photoCount}
              </span>
            ) : null}
            {slot.videoCount > 0 ? (
              <span className="rounded bg-primary/12 px-1 py-px text-[7px] font-bold text-primary">
                ▶{slot.videoCount}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-0.5 text-[7px] text-muted-foreground">경험</p>
        )}
        {slot.locked ? (
          <Lock className="absolute -right-1 -top-1 size-3 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
    </div>
  );
});
