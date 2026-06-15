#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { applyRimvioGlobeMapTileCanvas } from "../lib/globe/apply-rimvio-globe-map-tile-canvas";
import {
  RIMVIO_GLOBE_RASTER_CANVAS,
} from "../lib/globe/rimvio-globe-raster-canvas-theme";

const w = 5;
const h = 5;
const pixels = new Uint8ClampedArray(w * h * 4);

for (let i = 0; i < w * h; i++) {
  const o = i * 4;
  pixels[o] = 241;
  pixels[o + 1] = 242;
  pixels[o + 2] = 244;
  pixels[o + 3] = 255;
}

pixels[12] = 110;
pixels[13] = 112;
pixels[14] = 115;
pixels[15] = 255;

pixels[24] = 230;
pixels[25] = 90;
pixels[26] = 70;
pixels[27] = 255;

applyRimvioGlobeMapTileCanvas(pixels, w, h);

assert.equal(pixels[12], RIMVIO_GLOBE_RASTER_CANVAS.land.r);
assert.equal(pixels[24], RIMVIO_GLOBE_RASTER_CANVAS.land.r);

console.log("test-rimvio-globe-map-tile-canvas: ok");
