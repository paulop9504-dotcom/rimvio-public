"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

export type SurfaceTransientHintProps = {
  message: string;
  tone?: "info" | "neutral";
  className?: string;
};

export const SurfaceTransientHint = memo(function SurfaceTransientHint({
  message,
  tone = "info",
  className,
}: SurfaceTransientHintProps) {
  return (
    <div
      className={cn("px-3", className)}
      role="status"
      data-surface-transient-hint={tone}
    >
      <p
        className={cn(
          "rounded-lg px-3 py-2 text-[12px] leading-relaxed",
          tone === "info" &&
            "border border-amber-200/50 bg-amber-50/95 text-amber-950/85",
          tone === "neutral" &&
            "border border-white/10 bg-white/[0.06] text-white/60",
        )}
      >
        {message}
      </p>
    </div>
  );
});
