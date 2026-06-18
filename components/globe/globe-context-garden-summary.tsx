"use client";

import type { ContextGardenSummary } from "@/lib/globe/context-gardener/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextGardenSummaryProps = {
  summary: ContextGardenSummary | null;
  className?: string;
};

export function GlobeContextGardenSummary({
  summary,
  className,
}: GlobeContextGardenSummaryProps) {
  if (!summary || summary.linesKo.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-[1.1rem] border border-border/50 bg-muted/30 px-3 py-2.5 shadow-sm",
        className,
      )}
      data-globe-context-garden-summary
      aria-label={summary.headlineKo}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
        {copy.globe.contextGardenSummaryEyebrow}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
        {summary.headlineKo}
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {summary.linesKo.map((line) => (
          <li
            key={line}
            className="text-[11px] font-medium leading-snug text-muted-foreground"
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
