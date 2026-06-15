#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { GLOBE_TILE_MAX_ZOOM } from "../lib/globe/globe-tile-constants";
import {
  buildGlobeTileEngineUrl,
  globeTileEngineUrl,
  resolveGlobeTileStyleForLevel,
} from "../lib/globe/globe-tile-engine-url";
import { resolveGlobePinLabelStyle } from "../lib/globe/resolve-globe-pin-label-style";
import {
  altitudeForGlobeDetailLevel,
  GLOBE_MIN_SAFE_ALTITUDE,
  resolveGlobeDetailLevel,
} from "../lib/globe/globe-zoom-levels";
import { accuracyMetersToRingDegrees } from "../lib/globe/accuracy-ring-degrees";

assert.equal(GLOBE_TILE_MAX_ZOOM, 20);
assert.match(buildGlobeTileEngineUrl(120, 210, 21, "light"), /z=20/);
assert.equal(resolveGlobeTileStyleForLevel(0), "voyager");
assert.equal(resolveGlobeTileStyleForLevel(8), "voyager");
assert.match(globeTileEngineUrl(120, 210, 8), /style=voyager/);
assert.match(globeTileEngineUrl(120, 210, 3), /v=7/);

assert.equal(resolveGlobeDetailLevel(2.2), "space");
assert.equal(resolveGlobeDetailLevel(0.1), "city");
assert.equal(resolveGlobeDetailLevel(0.015), "neighborhood");
assert.equal(resolveGlobeDetailLevel(0.003), "street");
assert.equal(resolveGlobeDetailLevel(0.001), "pin");

assert.ok(altitudeForGlobeDetailLevel("pin") >= GLOBE_MIN_SAFE_ALTITUDE);
assert.equal(resolveGlobePinLabelStyle("pin").show, false);
assert.equal(resolveGlobePinLabelStyle("city").show, false);

const ring = accuracyMetersToRingDegrees(37.5, 32);
assert.ok(ring > 0.0002 && ring < 0.01);

console.log("test-globe-toss-zoom: ok");
