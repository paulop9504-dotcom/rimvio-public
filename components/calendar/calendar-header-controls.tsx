"use client";

import { Calendar, Maximize2 } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

type CalendarHeaderControlsProps = {
  badgeCount: number;
  onOpenSheet: () => void;
  onOpenFull?: () => void;
  className?: string;
};

/** Header split control — sheet (📅) + full calendar (⤢). */
export function CalendarHeaderControls({
  badgeCount,
  onOpenSheet,
  onOpenFull,
  className,
}: CalendarHeaderControlsProps) {
  const copy = useCopy();

  return (
    <div
      className={cn(
        "flex items-center rounded-full bg-secondary p-0.5 shadow-[inset_0_0_0_1px_var(--border)]",
        className,
      )}
    >
      <button
        type="button"
        aria-label={copy.nav.calendar}
        onClick={onOpenSheet}
        className="relative flex size-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent active:scale-95 sm:size-9"
      >
        <Calendar className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-extrabold tabular-nums leading-none text-primary-foreground sm:-right-1 sm:-top-1 sm:size-[1.125rem] sm:min-w-[1.125rem] sm:text-[10px]",
            badgeCount <= 0 && "pointer-events-none opacity-0",
          )}
          aria-hidden={badgeCount <= 0}
        >
          {badgeCount > 9 ? "9+" : badgeCount || "1"}
        </span>
      </button>
      {onOpenFull ? (
        <button
          type="button"
          aria-label={copy.calendar.fullScreen}
          title={copy.calendar.fullScreen}
          onClick={onOpenFull}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 sm:size-8"
        >
          <Maximize2 className="size-3.5 sm:size-4" strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
}
