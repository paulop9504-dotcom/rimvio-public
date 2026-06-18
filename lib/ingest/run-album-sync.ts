import { Capacitor } from "@capacitor/core";
import { listEventCandidates } from "@/lib/events/event-store";
import {
  canRunAlbumSyncOnNetwork,
  readAlbumSyncNetworkType,
} from "@/lib/ingest/album-sync-network";
import { resolveGlobeAlbumScanRange } from "@/lib/globe/resolve-globe-album-scan-range";
import { scoreAlbumItemAgainstGlobeContexts } from "@/lib/globe/score-album-item-against-contexts";
import {
  isAlbumAssetImported,
  markAlbumAssetImported,
  readAlbumSyncPrefs,
  writeAlbumSyncPrefs,
  type AlbumSyncPrefs,
} from "@/lib/preferences/album-sync";
import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import { listMediaSpacetimeContexts } from "@/lib/location-ping/media-context-store";
import {
  emitAlbumSyncProgress,
  IDLE_ALBUM_SYNC_PROGRESS,
} from "@/lib/ingest/album-sync-progress";
import {
  RimvioNativeBridge,
  isNativeShell,
} from "@/lib/native-bridge/rimvio-native-bridge";
import type { NativePhotoLibraryItem } from "@/lib/native-bridge/rimvio-native-bridge.types";

export type AlbumSyncRunStatus =
  | "disabled"
  | "waiting_wifi"
  | "offline"
  | "web_unsupported"
  | "permission_denied"
  | "done"
  | "error";

export type AlbumSyncRunResult = {
  status: AlbumSyncRunStatus;
  scanned: number;
  imported: number;
  skipped: number;
  message: string;
};

const BATCH_LIMIT = 40;
const MAX_SCAN_WINDOW_DAYS = 365 * 5;

function filterScannedPhotos(input: {
  photos: NativePhotoLibraryItem[];
  sinceMs: number;
  untilMs: number;
}): NativePhotoLibraryItem[] {
  return input.photos.filter(
    (item) =>
      item.capturedAtMs >= input.sinceMs && item.capturedAtMs <= input.untilMs,
  );
}

async function isAlbumAssetInContextStore(assetId: string): Promise<boolean> {
  const key = assetId.trim();
  if (!key) {
    return true;
  }
  const contexts = await listMediaSpacetimeContexts();
  return contexts.some(
    (row) =>
      row.originRef === `album:${key}` || row.id === `album-${key}`,
  );
}

async function importAlbumAsset(input: {
  assetId: string;
  contentUri: string;
  fileName: string;
  mimeType: string;
}): Promise<boolean> {
  if (
    isAlbumAssetImported(input.assetId) ||
    (await isAlbumAssetInContextStore(input.assetId))
  ) {
    return false;
  }

  const copied = await RimvioNativeBridge.importPhotoToCache({
    contentUri: input.contentUri,
    fileName: input.fileName,
  });

  const src = Capacitor.convertFileSrc(copied.cachePath);
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`album_fetch_failed:${response.status}`);
  }

  const blob = await response.blob();
  const file = new File(
    [blob],
    copied.fileName || input.fileName || `album-${input.assetId}.jpg`,
    { type: copied.mimeType || input.mimeType || blob.type || "image/jpeg" },
  );

  await attachMediaSpacetime({
    file,
    origin: "other",
    originRef: `album:${input.assetId}`,
    stableContextId: `album-${input.assetId}`,
  });

  markAlbumAssetImported(input.assetId);
  return true;
}

function finishProgress() {
  emitAlbumSyncProgress(IDLE_ALBUM_SYNC_PROGRESS);
}

/** Native album scan → context-match pipeline (not full-library upload). */
export async function runAlbumSync(input?: {
  force?: boolean;
}): Promise<AlbumSyncRunResult> {
  const prefs = readAlbumSyncPrefs();
  if (!prefs.enabled && !input?.force) {
    finishProgress();
    return {
      status: "disabled",
      scanned: 0,
      imported: 0,
      skipped: 0,
      message: "자동 가져오기가 꺼져 있어요",
    };
  }

  if (!isNativeShell()) {
    finishProgress();
    return {
      status: "web_unsupported",
      scanned: 0,
      imported: 0,
      skipped: 0,
      message: "사진첩 자동 가져오기는 Rimvio 앱(Android · iOS)에서 사용할 수 있어요",
    };
  }

  emitAlbumSyncProgress({
    phase: "scanning",
    total: 0,
    current: 0,
    label: "사진첩 확인 중…",
  });

  const networkType = await readAlbumSyncNetworkType();
  if (networkType === "none") {
    finishProgress();
    return {
      status: "offline",
      scanned: 0,
      imported: 0,
      skipped: 0,
      message: "인터넷에 연결되면 다시 시도해요",
    };
  }

  if (
    !input?.force &&
    !canRunAlbumSyncOnNetwork({
      networkType,
      policy: prefs.networkPolicy,
    })
  ) {
    finishProgress();
    return {
      status: "waiting_wifi",
      scanned: 0,
      imported: 0,
      skipped: 0,
      message: "Wi-Fi 연결 시 사진을 가져와요",
    };
  }

  try {
    const permission = await RimvioNativeBridge.requestPhotoLibraryPermission();
    if (!permission.granted) {
      finishProgress();
      return {
        status: "permission_denied",
        scanned: 0,
        imported: 0,
        skipped: 0,
        message: "사진첩 접근 권한이 필요해요",
      };
    }

    const nowMs = Date.now();
    const events = listEventCandidates();
    const scanRange = resolveGlobeAlbumScanRange({
      events,
      prefsWindowDays: prefs.windowDays,
    });
    const rollingSinceMs = nowMs - prefs.windowDays * 86_400_000;
    const sinceMs = Math.min(
      scanRange.sinceMs,
      rollingSinceMs,
      prefs.lastSyncCursorMs ?? rollingSinceMs,
    );
    const untilMs = scanRange.untilMs;
    const windowDays = Math.min(
      MAX_SCAN_WINDOW_DAYS,
      Math.max(prefs.windowDays, Math.ceil((nowMs - sinceMs) / 86_400_000)),
    );

    const scan = await RimvioNativeBridge.scanPhotoLibrary({
      sinceMs,
      limit: BATCH_LIMIT,
      windowDays,
    });

    const candidates = filterScannedPhotos({
      photos: scan.photos,
      sinceMs,
      untilMs,
    });

    const total = candidates.length;
    emitAlbumSyncProgress({
      phase: "importing",
      total: Math.max(total, 1),
      current: 0,
      label:
        total > 0
          ? `맥락 맞는 사진 가져오기 · ${total}장`
          : scanRange.hasContextWindows
            ? "맥락 구간 새 사진 없음"
            : "새 사진 없음",
    });

    let imported = 0;
    let skipped = 0;

    for (let index = 0; index < candidates.length; index += 1) {
      const item = candidates[index]!;
      emitAlbumSyncProgress({
        phase: "importing",
        total: Math.max(total, 1),
        current: index + 1,
        label: `가져오는 중 · ${index + 1}/${total}`,
      });

      const match = scoreAlbumItemAgainstGlobeContexts({
        item: {
          capturedAtIso: new Date(item.capturedAtMs).toISOString(),
          lat: item.lat,
          lng: item.lng,
        },
        events,
      });
      if (!match.matches) {
        skipped += 1;
        continue;
      }

      try {
        const ok = await importAlbumAsset({
          assetId: item.id,
          contentUri: item.contentUri,
          fileName: item.fileName,
          mimeType: item.mimeType,
        });
        if (ok) {
          imported += 1;
        } else {
          skipped += 1;
        }
      } catch {
        skipped += 1;
      }
    }

    emitAlbumSyncProgress({
      phase: "matching",
      total: Math.max(total, 1),
      current: total,
      label: "경험 맥락 연결 중…",
    });

    const nextCursorMs = Math.max(
      scan.nextCursorMs ?? sinceMs,
      prefs.lastSyncCursorMs ?? rollingSinceMs,
    );

    writeAlbumSyncPrefs({
      lastSyncAtIso: new Date().toISOString(),
      lastSyncCursorMs: nextCursorMs,
    } satisfies Partial<AlbumSyncPrefs>);

    emitAlbumSyncProgress({
      phase: "done",
      total: Math.max(total, 1),
      current: total,
      label:
        imported > 0
          ? `${imported}장 가져옴`
          : "맥락 맞는 새 사진 없음",
    });
    if (typeof window !== "undefined") {
      window.setTimeout(finishProgress, 2_000);
    }

    return {
      status: "done",
      scanned: candidates.length,
      imported,
      skipped,
      message:
        imported > 0
          ? `맥락 검사 후 ${imported}장 가져왔어요`
          : "새로 가져올 사진이 없거나 맥락이 맞지 않았어요",
    };
  } catch {
    emitAlbumSyncProgress({
      phase: "error",
      total: 1,
      current: 0,
      label: "동기화 실패",
    });
    if (typeof window !== "undefined") {
      window.setTimeout(finishProgress, 2_000);
    }
    return {
      status: "error",
      scanned: 0,
      imported: 0,
      skipped: 0,
      message: "사진첩 동기화에 실패했어요",
    };
  }
}
