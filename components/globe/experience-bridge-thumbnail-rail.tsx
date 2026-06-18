"use client";

import { cn } from "@/lib/utils";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";

export type ExperienceBridgeThumbnailRailProps = {
  items: readonly ContextMediaReelItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
};

function thumbSrc(item: ContextMediaReelItem): string | null {
  return item.imageUrl?.trim() || null;
}

/** Horizontal filmstrip — jump between shared moments. */
export function ExperienceBridgeThumbnailRail({
  items,
  activeIndex,
  onSelect,
  className,
}: ExperienceBridgeThumbnailRailProps) {
  if (items.length < 2) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      data-experience-bridge-thumbnail-rail
    >
      {items.map((item, index) => {
        const src = thumbSrc(item);
        const active = index === activeIndex;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "relative h-14 w-10 shrink-0 overflow-hidden rounded-lg transition",
              active
                ? "scale-105 shadow-md ring-2 ring-primary"
                : "opacity-80 ring-1 ring-border hover:opacity-100",
            )}
            aria-label={`${index + 1}번째 순간`}
            aria-current={active ? "true" : undefined}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                className="size-full object-cover brightness-[1.03] saturate-[1.06]"
                loading="lazy"
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-gradient-to-br from-primary/30 to-violet-500/25 text-[9px] font-bold text-white/80">
                {item.kind === "video" ? "▶" : "◆"}
              </span>
            )}
            {item.kind === "video" ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 text-[10px] text-white">
                ▶
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
