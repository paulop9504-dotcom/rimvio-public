"use client";

import type { RepresentativeMoment } from "@/lib/globe/project-representative-moments";
import { cn } from "@/lib/utils";

export type RepresentativeMomentsRowProps = {
  moments: readonly RepresentativeMoment[];
  className?: string;
};

/** Top 3 scenes — no carousel, vertical stack. */
export function RepresentativeMomentsRow({
  moments,
  className,
}: RepresentativeMomentsRowProps) {
  if (moments.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-2", className)} data-representative-moments>
      <p className="text-[12px] font-semibold text-muted-foreground">대표 장면</p>
      <ul className="space-y-2">
        {moments.map((moment) => (
          <li
            key={moment.id}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] font-medium text-foreground"
          >
            {moment.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
