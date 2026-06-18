"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

export type SurfaceWhyLineProps = {
  line: string;
  className?: string;
};

/** User-facing “why this surface” — one calm sentence. */
export const SurfaceWhyLine = memo(function SurfaceWhyLine({
  line,
  className,
}: SurfaceWhyLineProps) {
  return (
    <p
      className={cn(
        "rounded-lg border border-emerald-200/80 bg-emerald-50 px-3 py-2 text-[12px] leading-relaxed text-emerald-900/80",
        className,
      )}
      data-surface-why
    >
      {line}
    </p>
  );
});
