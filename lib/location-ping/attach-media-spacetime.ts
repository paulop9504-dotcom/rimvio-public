"use client";

import { appendSearchActivity } from "@/lib/location-memory/search-activity-log";
import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import {
  appendGpsPing,
  listRecentGpsPings,
} from "@/lib/location-ping/gps-ping-store";
import { saveMediaBlob } from "@/lib/location-ping/media-blob-store";
import {
  listMediaSpacetimeContexts,
  saveMediaSpacetimeContext,
} from "@/lib/location-ping/media-context-store";
import { readImageExifMetadata } from "@/lib/location-ping/read-image-exif-metadata";
import {
  isHistoricalCaptureMs,
  resolveCaptureSpacetime,
} from "@/lib/location-ping/resolve-capture-spacetime";
import { prepareShareVideoFile } from "@/lib/media/share-video-compress/prepare-share-video-file";
import { SHARE_VIDEO_MAX_DURATION_SEC } from "@/lib/media/share-video-compress/constants";
import { readVideoDurationSec } from "@/lib/media/share-video-compress/read-video-duration-sec";
import type {
  MediaSpacetimeContext,
  MediaSpacetimeOrigin,
} from "@/lib/location-ping/types";

function inferMediaKind(file: File): MediaSpacetimeContext["mediaKind"] {
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type.startsWith("image/")) {
    return "photo";
  }
  return "other";
}

/** Sample GPS immediately before upload so the nearest ping is fresh. */
async function boostGpsPingForUpload(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return;
  }

  await new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void appendGpsPing({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
          source: "upload_boost",
        }).finally(resolve);
      },
      () => resolve(),
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 8_000,
      },
    );
  });
}

export async function attachMediaSpacetime(input: {
  file: File;
  origin: MediaSpacetimeOrigin;
  originRef?: string | null;
  /** Stable id for album-sync dedupe (`album-{mediaStoreId}`). */
  stableContextId?: string | null;
  /** Video compress / ffmpeg load — toast hook. */
  onFilePrepare?: (message: string) => void;
}): Promise<MediaSpacetimeContext> {
  const stableId = input.stableContextId?.trim();
  if (stableId) {
    const rows = await listMediaSpacetimeContexts();
    const hit = rows.find((row) => row.id === stableId);
    if (hit) {
      return hit;
    }
  }

  const exifPeek = await readImageExifMetadata(input.file);
  const exifMs = exifPeek.dateTimeIso ? Date.parse(exifPeek.dateTimeIso) : Number.NaN;
  const isHistorical =
    !Number.isNaN(exifMs) && isHistoricalCaptureMs(exifMs, Date.now());

  if (!isHistorical) {
    await boostGpsPingForUpload();
  }

  const pings = await listRecentGpsPings();
  const resolved = await resolveCaptureSpacetime({ file: input.file, pings });

  const placeLabel =
    resolved.lat !== null && resolved.lng !== null
      ? resolvePlaceLabelNearCoords(resolved.lat, resolved.lng)
      : null;

  const context: MediaSpacetimeContext = {
    id: stableId || crypto.randomUUID(),
    capturedAtIso: resolved.capturedAtIso,
    lat: resolved.lat,
    lng: resolved.lng,
    accuracyM: resolved.accuracyM,
    placeLabel,
    resolveSource: resolved.resolveSource,
    matchedPingId: resolved.matchedPingId,
    mediaKind: inferMediaKind(input.file),
    origin: input.origin,
    originRef: input.originRef?.trim() || null,
    fileName: input.file.name || null,
    attachedAtIso: new Date().toISOString(),
  };

  let storeFile = input.file;
  if (context.mediaKind === "video") {
    const durationSec = await readVideoDurationSec(input.file);
    const willTrim =
      durationSec != null &&
      durationSec > SHARE_VIDEO_MAX_DURATION_SEC + 0.5;
    if (willTrim) {
      input.onFilePrepare?.("2분까지만 넣을게요 · 준비 중…");
    }
    storeFile = await prepareShareVideoFile({
      file: input.file,
      onProgress: (progress) => {
        if (progress.phase === "loading") {
          input.onFilePrepare?.(
            willTrim ? "2분까지만 넣을게요 · 준비 중…" : "동영상 준비 중…",
          );
          return;
        }
        const pct =
          progress.ratio != null ? Math.round(progress.ratio * 100) : null;
        input.onFilePrepare?.(
          pct != null
            ? willTrim
              ? `2분으로 맞추는 중… ${pct}%`
              : `동영상 압축 중… ${pct}%`
            : willTrim
              ? "2분으로 맞추는 중…"
              : "동영상 압축 중…",
        );
      },
    });
    if (storeFile.name && storeFile.name !== context.fileName) {
      context.fileName = storeFile.name;
    }
  }

  await saveMediaSpacetimeContext(context);
  await saveMediaBlob(context.id, storeFile);

  if (resolved.lat !== null && resolved.lng !== null) {
    const label = placeLabel ?? "업로드한 사진";
    try {
      await appendSearchActivity({
        query: label,
        kind: "media_upload",
        place_label: label,
        lat: resolved.lat,
        lng: resolved.lng,
      });
    } catch {
      // Non-blocking — upload should still succeed.
    }
  }

  return context;
}

export function serializeMediaSpacetimeForUpload(
  context: MediaSpacetimeContext,
): string {
  return JSON.stringify({
    capturedAtIso: context.capturedAtIso,
    lat: context.lat,
    lng: context.lng,
    accuracyM: context.accuracyM,
    placeLabel: context.placeLabel,
    resolveSource: context.resolveSource,
    matchedPingId: context.matchedPingId,
    mediaKind: context.mediaKind,
  });
}
