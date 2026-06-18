export const ALBUM_SYNC_PROGRESS = "rimvio-album-sync-progress";

export type AlbumSyncProgressPhase =
  | "idle"
  | "scanning"
  | "importing"
  | "matching"
  | "done"
  | "error";

export type AlbumSyncProgress = {
  phase: AlbumSyncProgressPhase;
  total: number;
  current: number;
  label: string;
};

export const IDLE_ALBUM_SYNC_PROGRESS: AlbumSyncProgress = {
  phase: "idle",
  total: 0,
  current: 0,
  label: "",
};

export function emitAlbumSyncProgress(progress: AlbumSyncProgress) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<AlbumSyncProgress>(ALBUM_SYNC_PROGRESS, { detail: progress }),
  );
}
