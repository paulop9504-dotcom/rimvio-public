"use client";

import { cn } from "@/lib/utils";
import type { LodgingDynamicTags } from "@/lib/globe/lodging/lodging-dynamic-tag-types";

export type GlobeLodgingDynamicTagsProps = {
  tags: LodgingDynamicTags;
  variant?: "dark" | "light";
  className?: string;
};

/** Transit chips + situational one-liner on lodging focus card. */
export function GlobeLodgingDynamicTags({
  tags,
  variant = "dark",
  className,
}: GlobeLodgingDynamicTagsProps) {
  if (tags.chips.length === 0 && !tags.contextLine) {
    return null;
  }

  const light = variant === "light";

  return (
    <div className={cn("mt-2 space-y-2", className)} data-globe-lodging-dynamic-tags>
      {tags.chips.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {tags.chips.map((chip) => (
            <span
              key={chip.id}
              className={cn(
                "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-snug",
                light
                  ? "bg-black/[0.06] text-[#1d1d1f]"
                  : "bg-white/18 text-white backdrop-blur-sm",
              )}
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
      {tags.contextLine ? (
        <p
          className={cn(
            "text-[11px] font-medium leading-snug",
            light
              ? "text-[#6e6e73]"
              : "rounded-xl bg-white/10 px-2.5 py-2 text-white/92 backdrop-blur-sm",
          )}
        >
          {tags.contextLine}
        </p>
      ) : null}
    </div>
  );
}
