import assert from "node:assert/strict";
import {
  formatMediaPoolExpiryLabel,
  formatMediaPoolPlaceLabel,
  mediaPoolStartIsoFromContext,
} from "../lib/media-pool/format-media-pool-labels";
import {
  hasExifGpsCapture,
  shouldStageMediaToPool,
} from "../lib/media-pool/is-media-pool-candidate";
import { listMediaPoolItems } from "../lib/media-pool/list-media-pool-items";
import { pruneExpiredMediaPool } from "../lib/media-pool/prune-expired-media-pool";
import { MEDIA_POOL_RETENTION_MS } from "../lib/media-pool/media-pool-constants";
import {
  resetMediaContextStoreForTests,
  saveMediaSpacetimeContext,
} from "../lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "../lib/location-ping/types";

function baseContext(
  patch: Partial<MediaSpacetimeContext> = {},
): MediaSpacetimeContext {
  return {
    id: patch.id ?? "ctx-1",
    capturedAtIso: patch.capturedAtIso ?? "2026-06-01T14:30:00+09:00",
    lat: patch.lat ?? null,
    lng: patch.lng ?? null,
    accuracyM: patch.accuracyM ?? null,
    placeLabel: patch.placeLabel ?? null,
    resolveSource: patch.resolveSource ?? "file_mtime",
    matchedPingId: patch.matchedPingId ?? null,
    mediaKind: patch.mediaKind ?? "photo",
    origin: patch.origin ?? "feed_capture",
    originRef: patch.originRef ?? "globe",
    fileName: patch.fileName ?? "screenshot.png",
    attachedAtIso: patch.attachedAtIso ?? "2026-06-10T12:00:00+09:00",
    poolStatus: patch.poolStatus,
    expiresAtIso: patch.expiresAtIso,
  };
}

async function main() {
  const screenshot = baseContext({ resolveSource: "exif_datetime" });
  assert.equal(hasExifGpsCapture(screenshot), false);
  assert.equal(
    shouldStageMediaToPool({ context: screenshot }),
    true,
    "GPS-less screenshot should stage",
  );
  assert.equal(
    shouldStageMediaToPool({
      context: screenshot,
      forceAttachToHint: true,
    }),
    false,
    "pin-card attach bypasses pool",
  );

  const travel = baseContext({
    resolveSource: "exif_gps",
    lat: 33.45,
    lng: 126.92,
    placeLabel: "제주",
  });
  assert.equal(hasExifGpsCapture(travel), true);
  assert.equal(
    shouldStageMediaToPool({ context: travel }),
    false,
    "EXIF GPS keeps auto-pin path",
  );

  assert.equal(
    formatMediaPoolPlaceLabel(baseContext({ placeLabel: "강남" })),
    "대략 · 강남",
  );
  assert.equal(
    formatMediaPoolPlaceLabel(baseContext({ lat: 37.5, lng: 127.0 })),
    "대략 · 주변",
  );
  assert.equal(formatMediaPoolPlaceLabel(baseContext()), "위치 없음");

  const expiry = formatMediaPoolExpiryLabel(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  );
  assert.match(expiry ?? "", /3일/);

  const startIso = mediaPoolStartIsoFromContext(
    baseContext({ capturedAtIso: "2026-06-01T14:30:00+09:00" }),
  );
  assert.ok(startIso.includes("2026-06-01"));
  assert.ok(startIso.includes("14:30"));

  resetMediaContextStoreForTests();
  const now = Date.now();
  await saveMediaSpacetimeContext({
    ...baseContext({ id: "fresh", poolStatus: "staged" }),
    expiresAtIso: new Date(now + MEDIA_POOL_RETENTION_MS).toISOString(),
    origin: "media_pool",
    originRef: "pool",
  });
  await saveMediaSpacetimeContext({
    ...baseContext({ id: "expired", poolStatus: "staged" }),
    expiresAtIso: new Date(now - 60_000).toISOString(),
    origin: "media_pool",
    originRef: "pool",
  });
  await saveMediaSpacetimeContext({
    ...baseContext({ id: "attached", poolStatus: "attached" }),
    origin: "feed_capture",
    originRef: "event-1",
  });

  const listed = await listMediaPoolItems();
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, "fresh");

  const pruned = await pruneExpiredMediaPool(now);
  assert.equal(pruned.pruned, 1);
  assert.deepEqual(pruned.ids, ["expired"]);

  const afterPrune = await listMediaPoolItems();
  assert.equal(afterPrune.length, 1);
  assert.equal(afterPrune[0]?.id, "fresh");

  console.log("test-media-pool: ok");
}

void main();
