"use client";

import {
  useRef,
  type ReactNode,
  type TouchEvent,
} from "react";
import { ChevronLeft } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type PinMediaContextPage = "media" | "context";

export type PinOpenMediaContextPagerProps = {
  media: ReactNode;
  summary: string;
  page: PinMediaContextPage;
  onPageChange: (page: PinMediaContextPage) => void;
  variant?: "bridge" | "personal";
  className?: string;
  children: ReactNode;
};

type SwipeAxis = "h" | "v" | null;

function useHorizontalSwipeHandoff(input: {
  enabled: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const touchRef = useRef<{ x: number; y: number; axis: SwipeAxis }>({
    x: 0,
    y: 0,
    axis: null,
  });

  return {
    onTouchStart(event: TouchEvent) {
      if (!input.enabled) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      touchRef.current = { x: touch.clientX, y: touch.clientY, axis: null };
    },
    onTouchMove(event: TouchEvent) {
      if (!input.enabled) {
        return;
      }
      const touch = event.touches[0];
      if (!touch || touchRef.current.axis) {
        return;
      }
      const dx = touch.clientX - touchRef.current.x;
      const dy = touch.clientY - touchRef.current.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        return;
      }
      touchRef.current.axis =
        Math.abs(dx) > Math.abs(dy) * 1.25 ? "h" : "v";
    },
    onTouchEnd(event: TouchEvent) {
      if (!input.enabled) {
        return;
      }
      const touch = event.changedTouches[0];
      if (!touch || touchRef.current.axis !== "h") {
        touchRef.current.axis = null;
        return;
      }
      const dx = touch.clientX - touchRef.current.x;
      if (dx < -52) {
        input.onSwipeLeft();
      } else if (dx > 52) {
        input.onSwipeRight();
      }
      touchRef.current.axis = null;
    },
  };
}

export function PinOpenMediaContextPageTabs({
  page,
  onPageChange,
  className,
}: {
  page: PinMediaContextPage;
  onPageChange: (page: PinMediaContextPage) => void;
  variant?: "bridge" | "personal";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full bg-muted p-0.5 ring-1 ring-border",
        className,
      )}
      role="tablist"
      aria-label={copy.globe.bridgeContextPageEyebrow}
    >
      <button
        type="button"
        role="tab"
        aria-selected={page === "media"}
        onClick={() => onPageChange("media")}
        className={cn(
          "rounded-full px-3 py-1 text-[11px] font-semibold transition",
          page === "media"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
      >
        {copy.globe.bridgeMediaContextTabMoments}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={page === "context"}
        onClick={() => onPageChange("context")}
        className={cn(
          "rounded-full px-3 py-1 text-[11px] font-semibold transition",
          page === "context"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
      >
        {copy.globe.bridgeMediaContextTabContext}
      </button>
    </div>
  );
}

/** Pin sheet — one page at a time: media OR context text. */
export function PinOpenMediaContextPager({
  media,
  summary,
  page,
  onPageChange,
  variant = "personal",
  className,
  children,
}: PinOpenMediaContextPagerProps) {
  const bridge = variant === "bridge";

  const mediaSwipe = useHorizontalSwipeHandoff({
    enabled: page === "media",
    onSwipeLeft: () => onPageChange("context"),
    onSwipeRight: () => {},
  });

  const contextSwipe = useHorizontalSwipeHandoff({
    enabled: page === "context",
    onSwipeLeft: () => {},
    onSwipeRight: () => onPageChange("media"),
  });

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      data-pin-media-context-pager
      data-pin-media-context-page={page}
    >
      {page === "media" ? (
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
          {...mediaSwipe}
        >
          {media}
          {!bridge ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <button
              type="button"
              onClick={() => onPageChange("context")}
              className="pointer-events-auto rounded-full bg-background/95 px-3.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur-sm active:scale-[0.98]"
            >
              {copy.globe.bridgeContextSwipeHint}
            </button>
          </div>
          ) : null}
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
          {...contextSwipe}
        >
          <div className="shrink-0 border-b border-border px-4 pb-3 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              {copy.globe.bridgeContextPageEyebrow}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[15px] font-semibold text-foreground">
              {summary}
            </p>
            <button
              type="button"
              onClick={() => onPageChange("media")}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground active:opacity-80"
            >
              <ChevronLeft className="size-4" aria-hidden />
              {copy.globe.bridgeMediaSwipeBackHint}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-4">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use PinOpenMediaContextPager */
export const PinOpenBridgeMediaContextPager = PinOpenMediaContextPager;
