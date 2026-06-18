"use client";

import { useAlbumSync } from "@/hooks/use-album-sync";

/** Background album scan on native Android — gated by settings. */
export function AlbumSyncBootstrap() {
  useAlbumSync({ enabled: true });
  return null;
}
