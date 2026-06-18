import assert from "node:assert/strict";
import { buildGlobeContextWarmthPoints, scorePinClusterWarmth } from "@/lib/globe/build-globe-context-warmth-points";
import {
  resolveGlobeContextWarmthOpacity,
  resolveGlobeContextWarmthHeatmapSaturation,
  shouldRenderGlobeContextWarmth,
  warmthColorForDensity,
} from "@/lib/globe/globe-context-warmth-visual";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

function cluster(partial: Partial<PinCluster> & Pick<PinCluster, "lat" | "lng">): PinCluster {
  return {
    pinId: "pin:1",
    eventId: "evt:1",
    title: "제주",
    placeLabel: "제주",
    dateLabel: null,
    startedAtIso: null,
    evidence: {
      photoCount: 0,
      videoCount: 0,
      chatCount: 0,
      placePinCount: 0,
    },
    recallLine: null,
    ...partial,
  };
}

const rich = scorePinClusterWarmth(
  cluster({
    lat: 33.5,
    lng: 126.5,
    evidence: { photoCount: 8, videoCount: 2, chatCount: 1, placePinCount: 1 },
  }),
);
const plain = scorePinClusterWarmth(cluster({ lat: 37.5, lng: 127.0 }));
assert.ok(rich > plain);

const points = buildGlobeContextWarmthPoints([
  cluster({ lat: 33.5, lng: 126.5 }),
  cluster({ lat: 37.5, lng: 127.0, variant: "bridge_ghost" }),
  cluster({ lat: 35.1, lng: 129.0 }),
]);
assert.equal(points.length, 2);

assert.ok(resolveGlobeContextWarmthOpacity(0.9) === 1);
assert.ok(resolveGlobeContextWarmthOpacity(0.03) === 0);
assert.ok(resolveGlobeContextWarmthOpacity(0.2) > 0.55);
assert.equal(resolveGlobeContextWarmthHeatmapSaturation(2), 1.72);
assert.equal(resolveGlobeContextWarmthHeatmapSaturation(20), 1.12);

assert.equal(
  shouldRenderGlobeContextWarmth({
    enabled: true,
    pointCount: 2,
    altitude: 0.8,
  }),
  true,
);
assert.equal(
  shouldRenderGlobeContextWarmth({
    enabled: true,
    pointCount: 1,
    altitude: 0.8,
  }),
  false,
);

const low = warmthColorForDensity(0.1, 1);
const high = warmthColorForDensity(0.9, 1);
assert.match(low, /^rgba\(\d+,\d+,\d+,0\.\d+\)$/);
assert.match(high, /^rgba\(\d+,\d+,\d+,0\.\d+\)$/);
assert.ok(parseFloat(low.split(",")[3]!) < parseFloat(high.split(",")[3]!));

console.log("test-globe-context-warmth: ok");
