"use client";

import type { TripLegBarProjection } from "@/lib/globe/project-trip-leg-arcs";
import { cn } from "@/lib/utils";

export type ExperienceTripLegBarProps = {
  trip: TripLegBarProjection;
  className?: string;
};

/** Toss-style origin → destination strip for overseas trip pins. */
export function ExperienceTripLegBar({ trip, className }: ExperienceTripLegBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-[#0220470f] bg-white px-3 py-2.5 shadow-sm",
        className,
      )}
      data-experience-trip-leg-bar
    >
      <span
        className={cn(
          "truncate text-[13px] font-semibold",
          trip.activeLeg === "departure" ? "text-[#3182f6]" : "text-[#191f28]",
        )}
      >
        {trip.originLabel}
      </span>
      <span className="shrink-0 text-[12px] text-[#8b95a1]" aria-hidden>
        →
      </span>
      <span
        className={cn(
          "truncate text-[13px] font-semibold",
          trip.activeLeg === "destination" ? "text-[#3182f6]" : "text-[#191f28]",
        )}
      >
        {trip.destinationLabel}
      </span>
      {trip.departWhenLabel ? (
        <span className="ml-auto shrink-0 rounded-full bg-[#e8f3ff] px-2 py-0.5 text-[10px] font-bold text-[#3182f6]">
          {trip.departWhenLabel}
        </span>
      ) : null}
    </div>
  );
}
