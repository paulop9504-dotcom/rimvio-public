#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildMomentEventDraft } from "../lib/feed/bootstrap-spacetime-target";
import { scoreSpacetimeFit } from "../lib/feed/spacetime-fit";
import {
  buildExifAutoPinMetadata,
  mergeExifAutoPinOntoEvent,
} from "../lib/globe/exif-auto-pin-metadata";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import type { MediaSpacetimeContext } from "../lib/location-ping/types";

const JEJU = { lat: 33.4996, lng: 126.5312 };

function exifContext(
  partial: Partial<MediaSpacetimeContext> = {},
): MediaSpacetimeContext {
  return {
    id: "ctx-1",
    capturedAtIso: "2026-05-01T14:30:00+09:00",
    lat: JEJU.lat,
    lng: JEJU.lng,
    accuracyM: null,
    placeLabel: "33.50° N, 126.53° E",
    resolveSource: "exif_gps",
    matchedPingId: null,
    mediaKind: "photo",
    origin: "feed_capture",
    originRef: "globe",
    fileName: "jeju.jpg",
    attachedAtIso: new Date().toISOString(),
    ...partial,
  };
}

function testBuildExifAutoPinMetadata() {
  const meta = buildExifAutoPinMetadata(exifContext());
  assert.ok(meta);
  assert.equal(meta.exifAutoPinned, true);
  assert.equal(meta.globePlaceLat, JEJU.lat);
  assert.equal(meta.globePlaceLng, JEJU.lng);
  assert.equal(meta.globePlaceConfirmed, true);

  assert.equal(
    buildExifAutoPinMetadata(exifContext({ resolveSource: "gps_ping" })),
    null,
  );
}

function testResolveEventGlobeCoordsUsesExifPin() {
  resetEventCandidatesForTests();
  const draft = buildMomentEventDraft({
    capturedAtIso: "2026-05-01T14:30:00+09:00",
    placeLabel: "33.50° N, 126.53° E",
  });
  const merged = mergeExifAutoPinOntoEvent(draft, exifContext());
  const event = commitEventUpsert({
    id: merged.id,
    title: merged.title,
    category: merged.category,
    source: merged.source,
    lifecycle: merged.lifecycle,
    datetime: merged.datetime,
    place: merged.place,
    confidence: merged.confidence,
    metadata: merged.metadata,
    lifecycleUpdatedAt: merged.lifecycleUpdatedAt,
  });

  const coords = resolveEventGlobeCoords(event);
  const km =
    Math.hypot(coords.lat - JEJU.lat, coords.lng - JEJU.lng) * 111;
  assert.ok(km < 1, "pin should use EXIF GPS, not city geocode");
}

function testScoreSpacetimeFitUsesEventAnchor() {
  const fit = scoreSpacetimeFit({
    capturedAtIso: "2026-05-01T15:00:00+09:00",
    lat: JEJU.lat + 0.001,
    lng: JEJU.lng + 0.001,
    eventStartIso: "2026-05-01T14:30:00+09:00",
    eventEndIso: null,
    eventPlace: "제주",
    eventLat: JEJU.lat,
    eventLng: JEJU.lng,
    capturedPlaceLabel: "33.50° N, 126.53° E",
  });
  assert.equal(fit.fits, true);
  assert.ok(fit.placeOk);
  assert.ok((fit.distanceKm ?? 99) < 1);
}

testBuildExifAutoPinMetadata();
testResolveEventGlobeCoordsUsesExifPin();
testScoreSpacetimeFitUsesEventAnchor();

console.log("test-exif-auto-pin: ok");
