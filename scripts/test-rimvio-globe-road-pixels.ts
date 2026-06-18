#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isCartoWarmRoadPixel,
  remapRimvioGlobeRoadPixels,
} from "../lib/globe/remap-rimvio-globe-road-pixels";
import { RIMVIO_GLOBE_RASTER_CANVAS } from "../lib/globe/rimvio-globe-raster-canvas-theme";
import { shouldRemapRimvioGlobeMapTileStyle } from "../lib/globe/remap-rimvio-globe-map-tile-png";

const RIMVIO_GLOBE_ROAD_DARK_GRAY = RIMVIO_GLOBE_RASTER_CANVAS.road;

assert.ok(isCartoWarmRoadPixel(242, 184, 85, 255));
assert.ok(isCartoWarmRoadPixel(255, 220, 160, 255));
assert.ok(isCartoWarmRoadPixel(254, 243, 200, 255));
assert.ok(isCartoWarmRoadPixel(248, 238, 210, 255));
assert.ok(!isCartoWarmRoadPixel(40, 120, 60, 255));
assert.ok(!isCartoWarmRoadPixel(200, 210, 215, 255));
assert.ok(!isCartoWarmRoadPixel(252, 252, 250, 255));

const pixels = new Uint8ClampedArray([
  242, 184, 85, 255, 40, 120, 60, 255,
]);
remapRimvioGlobeRoadPixels(pixels, 2, 1);
assert.equal(pixels[0], RIMVIO_GLOBE_ROAD_DARK_GRAY.r);
assert.ok(pixels[0]! >= RIMVIO_GLOBE_ROAD_DARK_GRAY.r - 4);
assert.equal(pixels[4], 40);

const corridor = new Uint8ClampedArray([
  100, 104, 110, 255,
  252, 252, 250, 255,
  100, 104, 110, 255,
]);
remapRimvioGlobeRoadPixels(corridor, 3, 1);
assert.equal(corridor[4], RIMVIO_GLOBE_ROAD_DARK_GRAY.r);

assert.equal(shouldRemapRimvioGlobeMapTileStyle("voyager"), false);
assert.equal(shouldRemapRimvioGlobeMapTileStyle("light"), false);
assert.equal(shouldRemapRimvioGlobeMapTileStyle("satellite"), false);

console.log("test-rimvio-globe-road-pixels: ok");
