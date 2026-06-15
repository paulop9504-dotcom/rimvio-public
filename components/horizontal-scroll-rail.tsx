"use client";

import { ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type HorizontalScrollRailProps = {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  /** Gradient fade matches the surface behind the rail */
  fadeFrom?: string;
  hintLabel?: string;
  showHint?: boolean;
};

export function HorizontalScrollRail({
  children,
  className,
  scrollClassName,
  fadeFrom = "#ffffff",
  hintLabel = "더 보기",
  showHint = false,
}: HorizontalScrollRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const updateScrollState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(node);

    for (const child of node.children) {
      observer.observe(child);
    }

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, children]);

  return (
    <div className={cn("relative", className)}>
      {canScrollLeft ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7"
          style={{
            background: `linear-gradient(to right, ${fadeFrom}, transparent)`,
          }}
        />
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "flex overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          canScrollRight && showHint && "pr-14",
          scrollClassName
        )}
      >
        {children}
      </div>

      {canScrollRight && showHint ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 z-20 flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/90"
        >
          {hintLabel}
          <ChevronRight className="size-3" strokeWidth={2.5} />
        </span>
      ) : null}

      {canScrollRight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12"
          style={{
            background: `linear-gradient(to left, ${fadeFrom}, transparent)`,
          }}
        />
      ) : null}
    </div>
  );
}
