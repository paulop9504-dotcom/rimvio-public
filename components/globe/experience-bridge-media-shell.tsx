"use client";

import { useCallback, useRef, useState } from "react";
import { GlobeContextMediaShortsReel } from "@/components/globe/globe-context-media-shorts-reel";
import { ExperienceBridgeThumbnailRail } from "@/components/globe/experience-bridge-thumbnail-rail";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ExperienceBridgeMediaShellProps = {
  items: readonly ContextMediaReelItem[];
  title: string;
  place: string;
  eventId: string;
  viewerUserId?: string | null;
  deletable?: boolean;
  onMediaDeleted?: () => void;
  className?: string;
};

/** Bridge pin — clean Shorts reel + filmstrip (light, photo-first). */
export function ExperienceBridgeMediaShell({
  items,
  title,
  place,
  eventId,
  viewerUserId,
  deletable = false,
  onMediaDeleted,
  className,
}: ExperienceBridgeMediaShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeItem = items[activeIndex] ?? items[0] ?? null;
  const activeAuthor =
    activeItem?.authorDisplayName?.trim() || copy.globe.bridgeInviteHostFallback;

  const scrollToIndex = useCallback((index: number) => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    const slide = root.querySelector<HTMLElement>(
      `[data-globe-context-shorts-slide][data-slide-index="${index}"]`,
    );
    slide?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveIndex(index);
  }, []);

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col bg-muted/25", className)}
      data-experience-bridge-media-shell
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={() => {
          const root = scrollRef.current;
          if (!root) {
            return;
          }
          const slides = root.querySelectorAll<HTMLElement>(
            "[data-globe-context-shorts-slide]",
          );
          const mid = root.scrollTop + root.clientHeight * 0.35;
          for (let i = 0; i < slides.length; i += 1) {
            const slide = slides[i]!;
            if (slide.offsetTop <= mid && slide.offsetTop + slide.offsetHeight > mid) {
              setActiveIndex(i);
              break;
            }
          }
        }}
      >
        <GlobeContextMediaShortsReel
          key={eventId}
          items={items}
          title={title}
          place={place}
          fillViewport
          embedded
          variant="bridge"
          eventId={eventId}
          viewerUserId={viewerUserId}
          deletable={deletable}
          onMediaDeleted={onMediaDeleted}
        />
      </div>

      <div className="shrink-0 space-y-2 border-t border-border/60 bg-background px-3 py-2.5">
        {items.length > 0 ? (
          <p className="text-center text-[12px] font-medium text-muted-foreground">
            {activeAuthor} · {activeIndex + 1}/{items.length}
          </p>
        ) : null}
        <ExperienceBridgeThumbnailRail
          items={items}
          activeIndex={activeIndex}
          onSelect={scrollToIndex}
        />
      </div>
    </div>
  );
}
