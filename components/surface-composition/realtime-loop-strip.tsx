"use client";

import { memo } from "react";
import type { LoopType } from "@/lib/loop-wiring/loop-contract";
import { deriveLoopContextKo } from "@/lib/surface-composition/loop-why-copy";
import { cn } from "@/lib/utils";

const LOOP_LABEL: Record<LoopType, string> = {
  MORNING_LOOP: "아침",
  TRANSIT_LOOP: "이동",
  INTERRUPTION_LOOP: "방해",
  EVENING_LOOP: "저녁",
};

export type RealtimeLoopStripProps = {
  loopType: LoopType | null | undefined;
  overrideApplied?: boolean;
  className?: string;
};

export const RealtimeLoopStrip = memo(function RealtimeLoopStrip({
  loopType,
  overrideApplied,
  className,
}: RealtimeLoopStripProps) {
  const line = deriveLoopContextKo(loopType ?? null);
  if (!loopType || !line) {
    return null;
  }

  return (
    <div
      className={cn("px-3 pb-1", className)}
      data-realtime-loop={loopType}
      data-loop-override={overrideApplied ? "1" : "0"}
    >
      <p className="text-[11px] leading-snug text-white/45">
        <span className="mr-1.5 inline-flex rounded-md bg-white/[0.06] px-1.5 py-0.5 font-medium text-white/55">
          {LOOP_LABEL[loopType]}
        </span>
        {line}
      </p>
    </div>
  );
});
