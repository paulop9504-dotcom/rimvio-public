import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  altitudeFromPinchDistance,
  clampGlobeAltitude,
} from "../lib/globe/globe-focal-pinch-zoom";
import { GLOBE_MIN_SAFE_ALTITUDE } from "../lib/globe/globe-zoom-levels";

const start = 0.14;

assert.equal(clampGlobeAltitude(0.0001), GLOBE_MIN_SAFE_ALTITUDE);
assert.ok(clampGlobeAltitude(99) <= 2.2);

const spread = altitudeFromPinchDistance(start, 100, 150);
assert.ok(spread < start, "finger spread should zoom in");

const pinch = altitudeFromPinchDistance(start, 150, 100);
assert.ok(pinch > start, "finger pinch should zoom out");

assert.equal(
  altitudeFromPinchDistance(start, 100, 100),
  start,
  "no distance change keeps altitude",
);

const applyGlobeFocalZoomSource = readFileSync(
  "lib/globe/globe-focal-pinch-zoom.ts",
  "utf8",
);
assert.match(
  applyGlobeFocalZoomSource,
  /const pov = globe\.pointOfView\(\)/,
  "applyGlobeFocalZoom defines pov before use",
);

console.log("test-globe-focal-pinch-zoom: ok");
