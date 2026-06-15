"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FeedStoryStackProps = {
  layout: "capture-cover" | "compact";
  visual: ReactNode;
  meta?: ReactNode;
  /** Compact only ??receipt / poster zone above actions */
  ambient?: ReactNode;
  actions: ReactNode;
  insight?: ReactNode;
  className?: string;
};

/** Instagram-style stack ??visual + floating actions + optional receipt. No card chrome. */
export function FeedStoryStack({
  layout,
  visual,
  meta,
  ambient,
  actions,
  insight,
  className,
}: FeedStoryStackProps) {
  if (layout === "capture-cover") {
    return (
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden rounded-[28px]",
          "ring-1 ring-rimvio-neon-purple/15 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.22)]",
          className
        )}
      >
        <div className="absolute inset-0">{visual}</div>

        {meta ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3.5 pt-3.5">
            {meta}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-20 space-y-2 px-3.5 pb-2.5 pt-14">
          {insight}
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 pr-10",
        !ambient && "justify-end",
        className
      )}
    >
      {meta ? <div className="shrink-0">{meta}</div> : null}
      {ambient ? <div className="flex min-h-0 flex-1 flex-col">{ambient}</div> : null}
      {visual ? <div className="shrink-0">{visual}</div> : null}
      {insight ? <div className="shrink-0">{insight}</div> : null}
      <div className="shrink-0 space-y-2.5">{actions}</div>
    </div>
  );
}
