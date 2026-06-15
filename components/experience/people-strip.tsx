"use client";

import { cn } from "@/lib/utils";

export type PeopleStripProps = {
  names: readonly string[];
  maxVisible?: number;
  className?: string;
};

/** Experience participants — memory index, not chat list. */
export function PeopleStrip({ names, maxVisible = 4, className }: PeopleStripProps) {
  const visible = names.slice(0, maxVisible);
  const overflow = Math.max(0, names.length - maxVisible);

  if (names.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-2", className)} data-people-strip>
      <p className="text-[12px] font-semibold text-muted-foreground">참석자</p>
      <div className="flex flex-wrap gap-2">
        {visible.map((name) => (
          <span
            key={name}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground"
          >
            {name}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] font-medium text-muted-foreground">
            +{overflow}
          </span>
        ) : null}
      </div>
    </section>
  );
}
