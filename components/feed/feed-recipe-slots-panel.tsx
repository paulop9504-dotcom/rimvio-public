"use client";

import { memo } from "react";
import type { FeedRecipeSlotProjection } from "@/lib/experience-intent/project-feed-recipe-slots";
import type { ExperienceIntent } from "@/lib/experience-intent/experience-intent-types";
import { cn } from "@/lib/utils";

export type FeedRecipeSlotsPanelProps = {
  intent: ExperienceIntent;
  slots: readonly FeedRecipeSlotProjection[];
  className?: string;
};

/** Intent-driven four-slot Feed card body (Retro Raincloud). */
export const FeedRecipeSlotsPanel = memo(function FeedRecipeSlotsPanel({
  intent,
  slots,
  className,
}: FeedRecipeSlotsPanelProps) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-1.5", className)}
      data-feed-recipe-panel
      data-feed-recipe-intent={intent}
    >
      {slots.map((slot) => (
        <div
          key={slot.kind}
          data-feed-recipe-slot={slot.kind}
          data-feed-recipe-slot-active={slot.active ? "true" : "false"}
          className={cn(
            "rounded-xl border px-2.5 py-2 transition-colors",
            slot.active
              ? "border-border bg-card shadow-sm"
              : "border-dashed border-border/70 bg-muted/30",
          )}
        >
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span aria-hidden>{slot.emoji}</span>
            {slot.label}
          </p>
          {slot.summary ? (
            <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-foreground">
              {slot.summary}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground/70">—</p>
          )}
        </div>
      ))}
    </div>
  );
});
