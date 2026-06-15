"use client";

import { memo } from "react";
import type { SynapticHabitRow } from "@/lib/synaptic/synapse-view-model";
import { cn } from "@/lib/utils";

export type SynapticHabitStripProps = {
  habits: readonly SynapticHabitRow[];
  className?: string;
};

/**
 * Subtle “frequently reinforced path” hint — synaptic memory made visible.
 */
export const SynapticHabitStrip = memo(function SynapticHabitStrip({
  habits,
  className,
}: SynapticHabitStripProps) {
  if (habits.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("px-3", className)}
      data-synaptic-habit-count={habits.length}
      aria-label="자주 쓰는 경로"
    >
      <p className="mb-1.5 text-[11px] font-medium tracking-wide text-white/40">
        자주 쓰는 경로
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {habits.map((row) => (
          <li
            key={row.id}
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[12px] text-white/70"
            title={`연결 강도 ${row.strengthPercent}%`}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80"
              aria-hidden
            />
            {row.label}
          </li>
        ))}
      </ul>
    </div>
  );
});
