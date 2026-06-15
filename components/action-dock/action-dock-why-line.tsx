"use client";

import { cn } from "@/lib/utils";

type ActionDockWhyLineProps = {
  line: string;
  className?: string;
  /** overlay = on photo / dark feed card */
  variant?: "default" | "overlay";
};

/** Deterministic “why MAIN?” — under Action Dock primary button. */
export function ActionDockWhyLine({
  line,
  className,
  variant = "default",
}: ActionDockWhyLineProps) {
  if (!line.trim()) {
    return null;
  }

  return (
    <p
      className={cn(
        "text-center text-[11px] leading-snug",
        variant === "overlay" ? "text-white/78" : "text-[#636366]",
        className,
      )}
      aria-label="이 액션이 1번인 이유"
    >
      {line}
    </p>
  );
}
