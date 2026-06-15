"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { BridgePreviewMedia } from "@/lib/globe/project-bridge-preview-media";

export type ExperienceBridgePreviewCollageProps = {
  media: readonly BridgePreviewMedia[];
  className?: string;
};

/** Invite / ghost sheet — stacked photo preview. */
export function ExperienceBridgePreviewCollage({
  media,
  className,
}: ExperienceBridgePreviewCollageProps) {
  const tiles = useMemo(() => media.slice(0, 3), [media]);

  if (tiles.length === 0) {
    return (
      <div
        className={cn(
          "relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-violet-500/15 to-sky-400/20 ring-1 ring-border",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (tiles.length === 1) {
    const row = tiles[0]!;
    return (
      <div
        className={cn(
          "relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-border shadow-sm",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.url}
          alt=""
          className="size-full object-cover brightness-[1.03] saturate-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid aspect-[16/10] grid-cols-3 gap-1 overflow-hidden rounded-2xl ring-1 ring-border shadow-sm",
        className,
      )}
    >
      {tiles.map((row, index) => (
        <div
          key={row.url}
          className={cn(
            "relative overflow-hidden bg-black",
            index === 0 && tiles.length >= 3 && "col-span-2 row-span-2",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={row.url}
            alt=""
            className="size-full object-cover brightness-[1.03] saturate-[1.06]"
            loading="lazy"
          />
          {row.kind === "video" ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
              ▶
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
