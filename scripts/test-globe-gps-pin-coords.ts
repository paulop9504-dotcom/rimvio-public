#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { detectGpsDwellClusters } from "../lib/location-ping/detect-gps-dwell-clusters";
import { ingestGpsDwellCluster } from "../lib/feed/ingest-gps-dwell-to-feed";
import { resetGpsDwellIngestStoreForTests } from "../lib/feed/gps-dwell-ingest-store";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { parseGpsDwellClusterIdCoords } from "../lib/globe/parse-gps-dwell-cluster-id";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";
import { resolvePlaceCoordinates } from "../lib/experience-graph/resolve-place-coordinates";
import type { GpsPing } from "../lib/location-ping/types";

/** Gyeryong — far from hardcoded Dunsan-dong city center. */
const GYERYONG = { lat: 36.2745, lng: 127.2488 };

function dwellPings(lat: number, lng: number): GpsPing[] {
  const base = Date.parse("2026-06-10T10:00:00+09:00");
  return [0, 12, 24, 36, 48].map((offsetMin, index) => ({
    id: `g${index}`,
    lat: lat + index * 0.0001,
    lng: lng + index * 0.0001,
    accuracyM: 15,
    capturedAtIso: new Date(base + offsetMin * 60_000).toISOString(),
    source: "periodic" as const,
  }));
}

function testGyeryongNotLabeledAsDunsan() {
  const clusters = detectGpsDwellClusters(
    dwellPings(GYERYONG.lat, GYERYONG.lng),
    new Date(Date.parse("2026-06-10T11:30:00+09:00")),
  );
  assert.equal(clusters.length, 1);
  const cluster = clusters[0]!;
  assert.notEqual(cluster.placeLabel, "둔산동");
  assert.ok(cluster.placeLabel.includes("°"));
}

function testGlobePinUsesGpsNotPlaceName() {
  resetEventCandidatesForTests();
  resetGpsDwellIngestStoreForTests();

  const clusters = detectGpsDwellClusters(
    dwellPings(GYERYONG.lat, GYERYONG.lng),
    new Date(Date.parse("2026-06-10T11:30:00+09:00")),
  );
  const cluster = clusters[0]!;
  const result = ingestGpsDwellCluster(cluster);
  assert.ok(result.event);

  const coords = resolveEventGlobeCoords(result.event!);
  const dunsan = resolvePlaceCoordinates("둔산동");
  const gpsKm =
    Math.hypot(coords.lat - cluster.lat, coords.lng - cluster.lng) * 111;
  const dunsanKm =
    Math.hypot(coords.lat - dunsan.lat, coords.lng - dunsan.lng) * 111;

  assert.ok(gpsKm < 1, "pin should stay on GPS cluster");
  assert.ok(dunsanKm > 10, "pin should not snap to Dunsan city center");
}

function testParseClusterIdBackfill() {
  const parsed = parseGpsDwellClusterIdCoords(
    "gps-dwell:1704067200000:36274:127249",
  );
  assert.deepEqual(parsed, { lat: 36.274, lng: 127.249 });

  const stamp = new Date().toISOString();
  const event = {
    id: "event:gps-dwell:1704067200000:36274:127249",
    title: "둔산동 · 3시간 체류",
    category: "travel" as const,
    source: "system" as const,
    lifecycle: "active" as const,
    datetime: "2026-06-10T10:00:00+09:00",
    place: "둔산동",
    confidence: 0.68,
    metadata: {
      feedCaptures: [
        {
          id: "gps-dwell:1704067200000:36274:127249",
          kind: "gps_dwell" as const,
          capturedAtIso: "2026-06-10T10:00:00+09:00",
          placeLabel: "둔산동",
          dwellMinutes: 220,
        },
      ],
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };

  const coords = resolveEventGlobeCoords(event);
  assert.ok(Math.abs(coords.lat - 36.274) < 0.001);
  assert.ok(Math.abs(coords.lng - 127.249) < 0.001);
}

testGyeryongNotLabeledAsDunsan();
testGlobePinUsesGpsNotPlaceName();
testParseClusterIdBackfill();
console.log("test-globe-gps-pin-coords: ok");
