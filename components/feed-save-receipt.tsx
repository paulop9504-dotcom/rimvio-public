"use client";

import { buildSaveReceipt } from "@/lib/feed/build-save-receipt";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

/** Thermal save receipt ??fills compact cards when no live insight yet. */
export function FeedSaveReceipt({
  link,
  primaryActionLabel,
  className,
}: {
  link: LinkRow;
  primaryActionLabel?: string | null;
  className?: string;
}) {
  const receipt = buildSaveReceipt(link, primaryActionLabel);

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#fffdf8] px-3.5 py-3",
        "shadow-[0_10px_28px_-18px_rgba(0,0,0,0.28)] ring-1 ring-rimvio-neon-purple/15",
        className
      )}
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-foreground/55">
          RIMVIO
        </p>
        <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground">
          ?�?�?�?�?�?�?�?�?�?�?�?�?�?�
        </p>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {receipt.lines.map((line) => (
          <div
            key={line.label}
            className="flex items-center justify-between gap-3 text-[11px]"
          >
            <span className="text-muted-foreground">{line.label}</span>
            <span className="truncate font-medium tabular-nums text-foreground">
              {line.value}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2.5 border-t border-dashed border-border pt-2 text-center text-[11px] font-semibold leading-snug text-foreground">
        {receipt.title}
      </p>

      <p className="mt-2 text-center text-[10px] tracking-[0.14em] text-muted-foreground">
        ?�?�?�?�?�?�?�?�?�?�?�?�?�?�
      </p>
      <p className="mt-1.5 text-center text-[10px] font-medium text-muted-foreground">
        {receipt.footer}
      </p>
    </div>
  );
}
