"use client";

import type { EvidenceSummaryRow } from "@/lib/globe/project-evidence-summary";
import { cn } from "@/lib/utils";

export type EvidenceListProps = {
  rows: readonly EvidenceSummaryRow[];
  className?: string;
};

function formatEvidenceValue(row: EvidenceSummaryRow): string | null {
  if (row.kind === "photo" || row.kind === "video") {
    return row.count > 0 ? String(row.count) : null;
  }
  if (row.count > 1) {
    return String(row.count);
  }
  return null;
}

/** Fixed-order evidence — photo → video → gps → schedule → link → memo. */
export function EvidenceList({ rows, className }: EvidenceListProps) {
  return (
    <section className={cn("space-y-2", className)} data-evidence-list>
      <p className="text-[12px] font-semibold text-muted-foreground">Evidence</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-background">
        {rows.map((row) => {
          const value = formatEvidenceValue(row);
          return (
            <li
              key={row.kind}
              className="flex items-center justify-between px-3 py-2.5 text-[14px]"
              data-evidence-kind={row.kind}
            >
              <span className="text-foreground">
                {value ? `${row.label} ${value}` : row.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
