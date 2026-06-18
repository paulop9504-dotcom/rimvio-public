"use client";

import type { TimeReceipt, TimeReceiptLine } from "@/lib/media/time-receipt";
import { cn } from "@/lib/utils";

function lineAmountClass(line: TimeReceiptLine) {
  if (line.kind === "total") {
    return "font-semibold text-[#5856D6]";
  }

  return "text-foreground";
}

export function TimeReceiptCard({
  receipt,
  loading,
}: {
  receipt: TimeReceipt | null;
  loading?: boolean;
}) {
  if (loading && !receipt) {
    return (
      <div className="rounded-2xl bg-[#f5f4ff] px-3 py-2.5 text-center text-[11px] text-muted-foreground ring-1 ring-[#5856D6]/10">
        ?�간 ?�수�?계산 중�?
      </div>
    );
  }

  if (!receipt?.available) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#f5f4ff] px-3 py-3 ring-1 ring-[#5856D6]/15">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5856D6]/80">
            ?�간 ?�수�?
          </p>
          <p className="mt-0.5 text-[12px] font-semibold leading-snug text-foreground">
            {receipt.headline}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#5856D6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5856D6]">
          {receipt.kindLabel}
        </span>
      </div>

      <div className="space-y-1.5 rounded-xl bg-rimvio-surface/80 px-2.5 py-2 ring-1 ring-rimvio-neon-purple/12">
        {receipt.lines.map((line) => (
          <div
            key={line.kind}
            className={cn(
              "flex items-center justify-between gap-3 text-[11px]",
              line.kind === "total" && "border-t border-dashed border-border pt-1.5"
            )}
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {line.icon} {line.label}
            </span>
            <span className={cn("shrink-0 tabular-nums", lineAmountClass(line))}>
              {line.display}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{receipt.detail}</p>
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">
        {receipt.disclaimer}
      </p>
    </div>
  );
}
