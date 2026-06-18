"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ExecutionTimelineProps = {
  children: ReactNode;
  className?: string;
};

/** Single continuous timeline spine — decision moments + chat below. */
export function ExecutionTimeline({ children, className }: ExecutionTimelineProps) {
  return (
    <div className={cn("relative", className)} data-execution-timeline="root">
      <div className="relative space-y-0">{children}</div>
    </div>
  );
}
