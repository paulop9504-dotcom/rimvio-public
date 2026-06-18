#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  globeContextTapHitRadiusMeters,
  resolveGlobeContextsNearTap,
} from "../lib/globe/resolve-globe-contexts-near-tap";
import type { PinCluster } from "../lib/globe/pin-cluster-types";

function cluster(
  id: string,
  lat: number,
  lng: number,
  startedAtIso: string | null = null,
): PinCluster {
  return {
    pinId: `pcluster:${id}`,
    eventId: id,
    title: id,
    placeLabel: id,
    lat,
    lng,
    dateLabel: null,
    startedAtIso,
    evidence: { photoCount: 1, videoCount: 0, chatCount: 0, placePinCount: 1 },
    recallLine: null,
  };
}

assert.equal(globeContextTapHitRadiusMeters("space"), null);
assert.equal(globeContextTapHitRadiusMeters("city"), null);
assert.ok(globeContextTapHitRadiusMeters("neighborhood")! > 0);

const near = resolveGlobeContextsNearTap({
  tapLat: 36.35,
  tapLng: 127.38,
  detailLevel: "neighborhood",
  clusters: [
    cluster("a", 36.3502, 127.3801, "2026-01-01T00:00:00.000Z"),
    cluster("b", 36.3504, 127.3803, "2026-02-01T00:00:00.000Z"),
    cluster("far", 36.36, 127.39),
  ],
});
assert.deepEqual(
  near.map((row) => row.eventId),
  ["a", "b"],
);

const zoomedOut = resolveGlobeContextsNearTap({
  tapLat: 36.35,
  tapLng: 127.38,
  detailLevel: "city",
  clusters: [cluster("a", 36.3502, 127.3801)],
});
assert.equal(zoomedOut.length, 0);

const single = resolveGlobeContextsNearTap({
  tapLat: 36.35,
  tapLng: 127.38,
  detailLevel: "street",
  clusters: [cluster("only", 36.35005, 127.38005)],
});
assert.equal(single.length, 1);
assert.equal(single[0]!.eventId, "only");

console.log("test-globe-contexts-near-tap: ok");
