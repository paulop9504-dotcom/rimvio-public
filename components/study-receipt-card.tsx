"use client";

import type { StudyReceipt, StudyReceiptLine } from "@/lib/study/build-study-receipt";
import { cn } from "@/lib/utils";

function lineValueClass(line: StudyReceiptLine) {
  if (line.kind === "memorize") {
    return "font-semibold text-[#7C3AED]";
  }

  if (line.kind === "exam") {
    return "text-[#636366] italic";
  }

  if (line.kind === "context") {
    return "text-foreground leading-snug";
  }

  return "text-foreground";
}

export function StudyReceiptCard({
  receipt,
  loading,
  compact = false,
}: {
  receipt: StudyReceipt | null;
  loading?: boolean;
  compact?: boolean;
}) {
  if (loading && !receipt) {
    return (
      <div className="rounded-2xl bg-[#f5f0ff] px-3 py-2.5 text-center text-[11px] text-muted-foreground ring-1 ring-[#7C3AED]/10">
        ?�험 ?�스?�잇 ?�리 중�?
      </div>
    );
  }

  if (!receipt?.available) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#fffdf8] ring-1 ring-[#7C3AED]/15",
        compact ? "px-3 py-2.5" : "px-3 py-3"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7C3AED]/80">
            ?�험 ?�스?�잇
          </p>
          <p className="mt-0.5 text-[12px] font-semibold leading-snug text-foreground">
            {receipt.headline}
          </p>
        </div>
        {receipt.pageLabel ? (
          <span className="shrink-0 rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7C3AED]">
            {receipt.pageLabel}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 rounded-xl bg-rimvio-surface/85 px-2.5 py-2 ring-1 ring-rimvio-neon-purple/12">
        {receipt.lines.map((line, index) => (
          <div
            key={`${line.kind}-${index}`}
            className={cn(
              "flex items-start gap-3 text-[11px]",
              line.kind === "context" ? "flex-col" : "justify-between",
              line.kind === "exam" && "border-t border-dashed border-border pt-1.5"
            )}
          >
            <span className="shrink-0 text-muted-foreground">
              {line.icon} {line.label}
            </span>
            <span
              className={cn(
                line.kind === "context" ? "w-full text-left" : "min-w-0 text-right",
                "leading-snug",
                lineValueClass(line)
              )}
            >
              {line.value}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {receipt.detail}
      </p>
      {!compact ? (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">
          {receipt.disclaimer}
        </p>
      ) : null}
    </div>
  );
}
