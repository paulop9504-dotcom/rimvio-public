"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

export type SurfaceStabilityStripProps = {
  learningPaused?: boolean;
  systemLoadLevel?: string;
  className?: string;
};

export const SurfaceStabilityStrip = memo(function SurfaceStabilityStrip({
  learningPaused,
  systemLoadLevel,
  className,
}: SurfaceStabilityStripProps) {
  if (!learningPaused && systemLoadLevel !== "high" && systemLoadLevel !== "critical") {
    return null;
  }

  const message = learningPaused
    ? "잠시 조용히 유지 중이에요 — 화면은 그대로, 학습만 쉬어가요"
    : "할 일이 많아서 제안을 천천히 바꿀게요";

  return (
    <div className={cn("px-3 pb-1", className)} data-surface-stability-strip>
      <p className="text-[11px] leading-snug text-muted-foreground">{message}</p>
    </div>
  );
});
