"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type GlobeContextMediaFocusCardProps = {
  title: string;
  recallCaption?: string | null;
  onClose: () => void;
  closeAriaLabel: string;
  hero: ReactNode;
  className?: string;
  onHeroPress?: () => void;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchMove?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
};

/** Map replay — media only; tap hero opens bridge. No footer chrome. */
export function GlobeContextMediaFocusCard({
  title,
  recallCaption,
  onClose,
  closeAriaLabel,
  hero,
  className,
  onHeroPress,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: GlobeContextMediaFocusCardProps) {
  const caption = recallCaption?.trim() || null;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[1.15rem] bg-[#1d1d1f] shadow-[0_16px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/10",
        className,
      )}
      data-globe-context-media-focus-card
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative">
        <div
          className={cn(
            "relative overflow-hidden bg-[#141416]",
            onHeroPress && "cursor-pointer",
          )}
          role={onHeroPress ? "button" : undefined}
          tabIndex={onHeroPress ? 0 : undefined}
          aria-label={onHeroPress ? title : undefined}
          onClick={
            onHeroPress
              ? (event) => {
                  event.stopPropagation();
                  onHeroPress();
                }
              : undefined
          }
          onKeyDown={
            onHeroPress
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onHeroPress();
                  }
                }
              : undefined
          }
        >
          {hero}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-1.5 top-1.5 z-[4] flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md active:scale-95"
          aria-label={closeAriaLabel}
        >
          <X className="size-3.5" aria-hidden />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2.5 pb-2 pt-10">
          <h2 className="line-clamp-2 text-[16px] font-bold leading-tight tracking-tight text-white">
            {title}
          </h2>
          {caption ? (
            <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-white/85">
              {caption}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
