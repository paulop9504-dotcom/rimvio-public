"use client";

import { useAlbumSyncProgress } from "@/hooks/use-album-sync-progress";
import { cn } from "@/lib/utils";
import { CloudDownload } from "lucide-react";

/** Subtle global sync indicator — shimmer bar, no spinner. */
export function AlbumSyncProgressChip() {
  const { progress, active, percent } = useAlbumSyncProgress();

  if (!active) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center",
        "pt-[max(env(safe-area-inset-top),0px)]",
      )}
      aria-live="polite"
      aria-label={progress.label || "사진 동기화 중"}
    >
      <div className="mx-3 mt-2 w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-rimvio-surface/95 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-2">
          <CloudDownload className="size-4 shrink-0 text-rimvio-neon-cyan" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">
              {progress.label || "사진 가져오는 중…"}
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rimvio-neon-purple to-rimvio-neon-cyan transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
}
