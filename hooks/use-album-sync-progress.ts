"use client";

import { useEffect, useState } from "react";
import {
  ALBUM_SYNC_PROGRESS,
  IDLE_ALBUM_SYNC_PROGRESS,
  type AlbumSyncProgress,
} from "@/lib/ingest/album-sync-progress";

export function useAlbumSyncProgress() {
  const [progress, setProgress] = useState<AlbumSyncProgress>(
    IDLE_ALBUM_SYNC_PROGRESS,
  );

  useEffect(() => {
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<AlbumSyncProgress>).detail;
      if (detail) {
        setProgress(detail);
      }
    };
    window.addEventListener(ALBUM_SYNC_PROGRESS, onProgress);
    return () => window.removeEventListener(ALBUM_SYNC_PROGRESS, onProgress);
  }, []);

  const active =
    progress.phase === "scanning" ||
    progress.phase === "importing" ||
    progress.phase === "matching";

  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : active
        ? 12
        : 0;

  return { progress, active, percent };
}
