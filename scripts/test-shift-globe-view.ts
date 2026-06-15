#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildSpatialGlobeView } from "../lib/experience-graph/resolve-place-coordinates";
import {
  clampGlobeZoom,
  shiftGlobeByPixelDelta,
  zoomGlobeFromPinch,
  zoomGlobeView,
} from "../lib/experience-graph/shift-globe-view";

const base = buildSpatialGlobeView({
  lat: 33.389,
  lng: 126.553,
  placeLabel: "제주",
  zoom: 1.85,
});

const panned = shiftGlobeByPixelDelta(base, 80, 0, 400);
assert.ok(panned.lng !== base.lng, "horizontal drag should change longitude");

const zoomed = zoomGlobeView(base, 1.2);
assert.ok(zoomed.zoom > base.zoom, "zoom in should increase scale");

const pinch = zoomGlobeFromPinch(base, base.zoom, 100, 150);
assert.ok(pinch.zoom > base.zoom, "pinch spread should zoom in");

assert.equal(clampGlobeZoom(0.5), 0.72);
assert.equal(clampGlobeZoom(99), 4.8);

console.log("test-shift-globe-view: ok");
