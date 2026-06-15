"use client";

import { useEffect, useState } from "react";
import type { TrueCostLine, TrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import { useVisibleDwell } from "@/hooks/use-visible-dwell";
import {
  clearReceiptExposure,
  registerReceiptExposure,
} from "@/lib/personalization/receipt-exposure";
import { cn } from "@/lib/utils";

function formatSignedAmount(line: TrueCostLine) {
  const formatted = `${Math.round(line.amount).toLocaleString("ko-KR")}원`;

  if (line.signed === "minus") {
    return `- ${formatted}`;
  }

  if (line.signed === "plus") {
    return `+ ${formatted}`;
  }

  return formatted;
}

function lineAmountClass(line: TrueCostLine) {
  if (line.kind === "net_hold") {
    return "font-semibold text-[#007AFF]";
  }

  if (line.signed === "minus") {
    return "text-rose-700";
  }

  return "text-foreground";
}

type TrueCostReceiptCardProps = {
  receipt: TrueCostReceipt | null;
  linkId: string;
  active?: boolean;
  compact?: boolean;
  onDefer?: (timing: {
    dwell_time_ms: number;
    time_to_action_ms: number;
  }) => void;
};

export function TrueCostReceiptCard({
  receipt,
  linkId,
  active = true,
  compact = false,
  onDefer,
}: TrueCostReceiptCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const { ref, getDwellMs, getTimeToActionMs } = useVisibleDwell(
    active && Boolean(receipt?.available) && !dismissed
  );

  useEffect(() => {
    if (!receipt?.available || dismissed || !active) {
      clearReceiptExposure(linkId);
      return;
    }

    registerReceiptExposure(linkId, {
      shownAt: Date.now(),
      getDwellMs,
    });

    return () => {
      clearReceiptExposure(linkId);
    };
  }, [active, dismissed, getDwellMs, linkId, receipt?.available]);

  if (!receipt?.available || dismissed) {
    return null;
  }

  return (
    <div
      id="true-cost-receipt"
      ref={ref}
      className={cn(
        "rounded-2xl bg-[#fffdf8] ring-1 ring-amber-500/15",
        compact ? "px-3 py-2.5" : "px-3 py-3"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">
            진짜 영수증
          </p>
          <p className="mt-0.5 text-[12px] font-semibold leading-snug text-foreground">
            {receipt.headline}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
          {receipt.deviceLabel}
        </span>
      </div>

      <div className="space-y-1.5 rounded-xl bg-white/80 px-2.5 py-2 ring-1 ring-black/[0.04]">
        {receipt.lines.map((line) => (
          <div
            key={line.kind}
            className={cn(
              "flex items-center justify-between gap-3 text-[11px]",
              line.kind === "net_hold" && "border-t border-dashed border-black/[0.08] pt-1.5"
            )}
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {line.icon} {line.label}
            </span>
            <span className={cn("shrink-0 tabular-nums", lineAmountClass(line))}>
              {formatSignedAmount(line)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{receipt.detail}</p>
      {!compact ? (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">
          {receipt.disclaimer}
        </p>
      ) : null}

      {onDefer && !compact ? (
        <button
          type="button"
          onClick={() => {
            const timing = {
              dwell_time_ms: getDwellMs(),
              time_to_action_ms: getTimeToActionMs() ?? getDwellMs(),
            };
            onDefer(timing);
            setDismissed(true);
          }}
          className="mt-2.5 flex h-9 w-full items-center justify-center rounded-xl bg-[#f2f2f7] text-[12px] font-semibold text-muted-foreground transition active:scale-[0.98]"
        >
          나중에 볼게
        </button>
      ) : null}
    </div>
  );
}
