"use client";

import { memo, useMemo } from "react";
import { surfaceTypeVisual } from "@/lib/feed/surface-type-visual";
import { surfaceTypeAccent } from "@/lib/feed/surface-type-accent";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { SurfaceType } from "@/lib/surface-engine/surface-contract";
import { cn } from "@/lib/utils";

function slotType(slot: FeedTodaySlot): SurfaceType {
  return slot.kind === "surface" ? slot.surface.type : slot.slotType;
}

export type FeedQuickActionStripProps = {
  slots: readonly FeedTodaySlot[];
  label: string;
  filterAllLabel: string;
  activeType: SurfaceType | null;
  onSelectType: (type: SurfaceType | null) => void;
  className?: string;
};

export const FeedQuickActionStrip = memo(function FeedQuickActionStrip({
  slots,
  label,
  filterAllLabel,
  activeType,
  onSelectType,
  className,
}: FeedQuickActionStripProps) {
  const chips = useMemo(() => {
    const counts = new Map<SurfaceType, number>();
    for (const slot of slots) {
      const type = slotType(slot);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([type, count]) => {
        const visual = surfaceTypeVisual(type);
        return {
          type,
          emoji: visual.emoji,
          chipLabel: visual.chipLabel,
          count,
        };
      })
      .slice(0, 5);
  }, [slots]);

  if (chips.length < 2) {
    return null;
  }

  return (
    <div className={cn("shrink-0 px-4 pb-2.5", className)} data-feed-quick-actions>
      <p className="mb-2 text-[11px] font-medium text-white/36">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onSelectType(null)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
            activeType === null
              ? "bg-white text-rimvio-ink"
              : "bg-white/[0.07] text-white/65 hover:bg-white/[0.1]",
          )}
        >
          {filterAllLabel}
        </button>

        {chips.map((chip) => (
          <button
            key={chip.type}
            type="button"
            onClick={() => onSelectType(activeType === chip.type ? null : chip.type)}
            className={cn(
              "flex min-w-[4rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 ring-1 ring-inset transition-transform active:scale-[0.97]",
              surfaceTypeAccent(chip.type),
              activeType === chip.type && "ring-2 ring-white/55",
            )}
          >
            <span className="text-[1.2rem] leading-none" aria-hidden>
              {chip.emoji}
            </span>
            <span className="max-w-[4.5rem] truncate text-[10px] font-semibold text-white/85">
              {chip.chipLabel}
            </span>
            <span className="text-[9px] font-bold tabular-nums text-white/45">{chip.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
