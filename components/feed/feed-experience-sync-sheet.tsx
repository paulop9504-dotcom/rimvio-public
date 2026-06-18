"use client";

import { memo } from "react";
import { SpatialMediaSyncPlayer } from "@/components/experience/spatial-media-sync-player";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { cn } from "@/lib/utils";

export type FeedExperienceSyncSheetProps = {
  open: boolean;
  volume: ExperienceVolume | null;
  onClose: () => void;
  className?: string;
};

/** Fullscreen-adjacent sheet — spatial sync player for a feed volume. */
export const FeedExperienceSyncSheet = memo(function FeedExperienceSyncSheet({
  open,
  volume,
  onClose,
  className,
}: FeedExperienceSyncSheetProps) {
  if (!open || !volume) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-end justify-center bg-black/40",
        className,
      )}
      data-feed-experience-sync-sheet
      role="dialog"
      aria-modal="true"
      aria-label={volume.title}
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-border bg-background px-4 pb-8 pt-4 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground">대표 장면</p>
            <h2 className="truncate text-[16px] font-semibold text-foreground">{volume.title}</h2>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-semibold text-foreground"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <SpatialMediaSyncPlayer volume={volume} hideGlobe experienceOpen />
      </div>
    </div>
  );
});
