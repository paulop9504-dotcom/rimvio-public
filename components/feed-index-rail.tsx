"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

type FeedIndexRailProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number, options?: { smooth?: boolean }) => void;
};

function indexFromClientY(clientY: number, rect: DOMRect, count: number) {
  if (count <= 1) {
    return 0;
  }

  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const ratio = y / rect.height;
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}

export function FeedIndexRail({
  count,
  activeIndex,
  onSelect,
}: FeedIndexRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);

  const ratio = count <= 1 ? 0 : activeIndex / (count - 1);

  const pickIndex = useCallback(
    (clientY: number, smooth: boolean) => {
      const track = trackRef.current;
      if (!track || count === 0) {
        return;
      }

      const index = indexFromClientY(clientY, track.getBoundingClientRect(), count);
      onSelect(index, { smooth });
    },
    [count, onSelect]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    setScrubbing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    pickIndex(event.clientY, false);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrubbing || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    pickIndex(event.clientY, false);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setScrubbing(false);
  };

  if (count <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 top-1/2 z-20 -translate-y-1/2",
        "flex items-center pl-1"
      )}
    >
      <div
        ref={trackRef}
        role="slider"
        aria-label="피드 위치"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={activeIndex + 1}
        aria-orientation="vertical"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "pointer-events-auto relative w-11 touch-none select-none",
          "h-[min(36vh,180px)]"
        )}
      >
        <span
          className="absolute inset-y-1 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-black/10"
          aria-hidden
        />

        <span
          className={cn(
            "absolute left-1/2 block h-5 w-[5px] rounded-full bg-foreground shadow-sm",
            scrubbing
              ? "transition-none"
              : "transition-[top] duration-200 ease-out"
          )}
          style={{
            top: `${ratio * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
