"use client";

import type { BulkMediaSpacetimePeek } from "@/lib/feed/bulk-media-spacetime-types";
import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import { listRecentGpsPings } from "@/lib/location-ping/gps-ping-store";
import { resolveCaptureSpacetime } from "@/lib/location-ping/resolve-capture-spacetime";

function inferMediaKind(file: File): BulkMediaSpacetimePeek["mediaKind"] {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith("video/")) {
    return "video";
  }
  const name = file.name.trim().toLowerCase();
  if (/\.(mp4|mov|m4v|webm|mkv|avi|3gp|3g2|qt|mpeg|mpg)$/iu.test(name)) {
    return "video";
  }
  return "photo";
}

/** Read capture time + place hints without persisting media blobs. */
export async function peekBulkMediaSpacetime(
  files: readonly File[],
): Promise<BulkMediaSpacetimePeek[]> {
  const pings = await listRecentGpsPings();
  const peeks: BulkMediaSpacetimePeek[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    const resolved = await resolveCaptureSpacetime({ file, pings });
    const hasGps =
      resolved.lat !== null &&
      resolved.lng !== null &&
      Number.isFinite(resolved.lat) &&
      Number.isFinite(resolved.lng);
    const placeLabel =
      hasGps && resolved.lat !== null && resolved.lng !== null
        ? resolvePlaceLabelNearCoords(resolved.lat, resolved.lng)
        : null;

    peeks.push({
      index,
      capturedAtIso: resolved.capturedAtIso,
      lat: resolved.lat,
      lng: resolved.lng,
      placeLabel,
      resolveSource: resolved.resolveSource,
      mediaKind: inferMediaKind(file),
      hasGps,
    });
  }

  return peeks;
}
