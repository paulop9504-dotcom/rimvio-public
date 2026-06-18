export const ALBUM_SYNC_STORAGE_KEY = "rimvio.album-sync.v1";
export const ALBUM_SYNC_UPDATED = "rimvio-album-sync-updated";

/** TeraBox-style transfer policy for background album ingest. */
export type AlbumSyncNetworkPolicy = "wifi_only" | "wifi_and_mobile";

export type AlbumSyncPrefs = {
  enabled: boolean;
  networkPolicy: AlbumSyncNetworkPolicy;
  /** Sync when app returns from background. */
  resumeOnOpen: boolean;
  /** How far back to scan on first run. */
  windowDays: number;
  lastSyncAtIso: string | null;
  /** Millisecond cursor for incremental native MediaStore scan. */
  lastSyncCursorMs: number | null;
  importedAssetIds: string[];
};

const DEFAULT: AlbumSyncPrefs = {
  enabled: false,
  networkPolicy: "wifi_only",
  resumeOnOpen: true,
  windowDays: 7,
  lastSyncAtIso: null,
  lastSyncCursorMs: null,
  importedAssetIds: [],
};

let memoryPrefs: AlbumSyncPrefs = { ...DEFAULT };

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ALBUM_SYNC_UPDATED));
  }
}

function normalizePrefs(raw: unknown): AlbumSyncPrefs {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT };
  }
  const row = raw as Partial<AlbumSyncPrefs>;
  const networkPolicy =
    row.networkPolicy === "wifi_and_mobile" ? "wifi_and_mobile" : "wifi_only";
  const importedAssetIds = Array.isArray(row.importedAssetIds)
    ? row.importedAssetIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    enabled: row.enabled === true,
    networkPolicy,
    resumeOnOpen: row.resumeOnOpen !== false,
    windowDays:
      typeof row.windowDays === "number" && row.windowDays > 0
        ? Math.min(30, Math.floor(row.windowDays))
        : DEFAULT.windowDays,
    lastSyncAtIso:
      typeof row.lastSyncAtIso === "string" ? row.lastSyncAtIso : null,
    lastSyncCursorMs:
      typeof row.lastSyncCursorMs === "number" ? row.lastSyncCursorMs : null,
    importedAssetIds: importedAssetIds.slice(-2000),
  };
}

export function readAlbumSyncPrefs(): AlbumSyncPrefs {
  if (typeof window === "undefined") {
    return { ...memoryPrefs };
  }
  try {
    const raw = localStorage.getItem(ALBUM_SYNC_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT };
    }
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT };
  }
}

export function writeAlbumSyncPrefs(
  patch: Partial<AlbumSyncPrefs>,
): AlbumSyncPrefs {
  const next = normalizePrefs({ ...readAlbumSyncPrefs(), ...patch });
  memoryPrefs = next;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ALBUM_SYNC_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota
    }
    emitUpdated();
  }

  return next;
}

export function isAlbumAssetImported(assetId: string): boolean {
  const key = assetId.trim();
  if (!key) {
    return true;
  }
  return readAlbumSyncPrefs().importedAssetIds.includes(key);
}

export function markAlbumAssetImported(assetId: string): AlbumSyncPrefs {
  const key = assetId.trim();
  if (!key) {
    return readAlbumSyncPrefs();
  }
  const prefs = readAlbumSyncPrefs();
  if (prefs.importedAssetIds.includes(key)) {
    return prefs;
  }
  return writeAlbumSyncPrefs({
    importedAssetIds: [...prefs.importedAssetIds, key].slice(-2000),
  });
}

export function resetAlbumSyncPrefsForTests() {
  memoryPrefs = { ...DEFAULT };
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(ALBUM_SYNC_STORAGE_KEY);
}
