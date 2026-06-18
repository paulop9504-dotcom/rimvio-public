#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resolveTripArcAltitude,
  resolveTripArcPeakKm,
} from "../lib/globe/resolve-trip-arc-altitude";

// GMP → CJU (~450 km) — short domestic hop stays low
const gmpCjuPeak = resolveTripArcPeakKm({
  startLat: 37.558,
  startLng: 126.794,
  endLat: 33.511,
  endLng: 126.493,
  emphasis: "focused",
});
assert.ok(gmpCjuPeak < 40, `expected flat domestic arc, got ${gmpCjuPeak}km`);
assert.ok(
  resolveTripArcAltitude({
    startLat: 37.558,
    startLng: 126.794,
    endLat: 33.511,
    endLng: 126.493,
    emphasis: "focused",
  }) < 0.008,
);

// Jeju → Osaka (~750 km) — regional hop, still much lower than fixed 0.1
const jejuOsakaPeak = resolveTripArcPeakKm({
  startLat: 33.511,
  startLng: 126.493,
  endLat: 34.693,
  endLng: 135.502,
  emphasis: "focused",
});
assert.ok(jejuOsakaPeak > gmpCjuPeak);
assert.ok(jejuOsakaPeak < 55, `expected moderate regional arc, got ${jejuOsakaPeak}km`);

// ICN → Frankfurt (~8600 km) — long haul hits cap
const icnFraPeak = resolveTripArcPeakKm({
  startLat: 37.469,
  startLng: 126.451,
  endLat: 50.037,
  endLng: 8.562,
  emphasis: "focused",
});
assert.equal(icnFraPeak, 72);

// Shorter distance → lower peak (distance-proportional)
assert.ok(
  resolveTripArcPeakKm({
    startLat: 37.558,
    startLng: 126.794,
    endLat: 33.511,
    endLng: 126.493,
  }) <
    resolveTripArcPeakKm({
      startLat: 37.469,
      startLng: 126.451,
      endLat: 50.037,
      endLng: 8.562,
    }),
);

console.log("test-trip-arc-altitude: ok");
