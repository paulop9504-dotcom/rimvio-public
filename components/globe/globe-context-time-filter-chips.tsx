"use client";

import {
  resolveGlobeContextTimeFilterLabel,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import { cn } from "@/lib/utils";

const FILTERS: GlobeContextTimeFilter[] = ["all", "this_year", "this_month"];

export type GlobeContextTimeFilterChipsProps = {
  value: GlobeContextTimeFilter;
  onChange: (value: GlobeContextTimeFilter) => void;
  className?: string;
};

export function GlobeContextTimeFilterChips({
  value,
  onChange,
  className,
}: GlobeContextTimeFilterChipsProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      data-globe-context-time-filter
    >
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 backdrop-blur-md active:scale-[0.98]",
            value === filter
              ? "bg-primary text-primary-foreground ring-primary/30"
              : "bg-card/95 text-foreground ring-border",
          )}
        >
          {resolveGlobeContextTimeFilterLabel(filter)}
        </button>
      ))}
    </div>
  );
}
