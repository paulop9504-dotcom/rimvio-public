"use client";

import { cn } from "@/lib/utils";

export type ExperienceDiscussionHeaderProps = {
  title: string;
  date?: string | null;
  place?: string | null;
  className?: string;
};

/** ROOM top — experience context, not messenger chrome. */
export function ExperienceDiscussionHeader({
  title,
  date,
  place,
  className,
}: ExperienceDiscussionHeaderProps) {
  const meta = [date, place].filter(Boolean).join(" · ");

  return (
    <div
      className={cn("min-w-0 flex-1 py-1", className)}
      data-experience-discussion-header
    >
      <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
      {meta ? (
        <p className="truncate text-[12px] text-muted-foreground">{meta}</p>
      ) : null}
    </div>
  );
}
