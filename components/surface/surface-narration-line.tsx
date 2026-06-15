"use client";

import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import { cn } from "@/lib/utils";

export function SurfaceNarrationLine({
  surface,
  className,
}: {
  surface: RankedSurface;
  className?: string;
}) {
  if (!surface.narration?.summary) {
    return null;
  }
  return (
    <p className={cn("text-[12px] leading-snug text-white/55", className)}>
      {surface.narration.summary}
    </p>
  );
}
