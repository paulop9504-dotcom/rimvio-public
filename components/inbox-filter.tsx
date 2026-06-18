"use client";

import { cn } from "@/lib/utils";
import { IOS } from "@/lib/ui/ios-surface";
import {
  CATEGORY_PILLS,
  type InboxFilterValue,
} from "@/lib/categories/types";

type InboxFilterProps = {
  value: InboxFilterValue;
  onChange: (value: InboxFilterValue) => void;
  counts: Partial<Record<InboxFilterValue, number>>;
  compact?: boolean;
};

export function InboxFilter({
  value,
  onChange,
  counts,
  compact = false,
}: InboxFilterProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        compact ? "-mx-1 mb-2 px-1" : "-mx-5 mb-4 px-5"
      )}
    >
      <div className="flex w-max gap-1.5">
        {CATEGORY_PILLS.map((pill) => {
          const active = value === pill.value;
          const count = counts[pill.value] ?? 0;

          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => onChange(pill.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full font-medium transition-all",
                compact ? "px-3 py-1.5 text-xs" : "gap-1.5 px-4 py-2 text-sm",
                active
                  ? IOS.pillActive
                  : cn(IOS.pillIdle, "text-muted-foreground hover:text-foreground")
              )}
            >
              {pill.emoji && !compact ? (
                <span aria-hidden>{pill.emoji}</span>
              ) : null}
              <span>{pill.label}</span>
              {pill.value !== "all" && count > 0 ? (
                <span
                  className={cn(
                    "tabular-nums",
                    compact
                      ? active
                        ? "text-background/70"
                        : "text-muted-foreground/80"
                      : active
                        ? "text-xs text-background/75"
                        : "text-xs text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
