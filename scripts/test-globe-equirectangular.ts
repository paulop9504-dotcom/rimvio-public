#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  clampGlobeLatitude,
  equirectangularPixelToLatLng,
  latLngToMercatorPixel,
  listMercatorTileCoords,
  reprojectMercatorMosaicToEquirectangular,
} from "../lib/experience-graph/reproject-mercator-to-equirectangular";

const seoul = { lat: 37.5665, lng: 126.978 };
const mercator = latLngToMercatorPixel(seoul.lat, seoul.lng, 2);
assert.ok(mercator.x > 0 && mercator.y > 0);

const center = equirectangularPixelToLatLng(512, 256, 1024, 512);
assert.ok(Math.abs(center.lat) < 1);
assert.ok(Math.abs(center.lng) < 1);

assert.equal(listMercatorTileCoords(2).length, 16);
assert.equal(clampGlobeLatitude(89), 85.05112878);

const mosaic = new Uint8ClampedArray(1024 * 1024 * 4);
for (let i = 0; i < mosaic.length; i += 4) {
  mosaic[i] = 20;
  mosaic[i + 1] = 80;
  mosaic[i + 2] = 40;
  mosaic[i + 3] = 255;
}
const eq = reprojectMercatorMosaicToEquirectangular({
  mercatorPixels: mosaic,
  mercatorWidth: 1024,
  mercatorHeight: 1024,
  zoom: 2,
  outputWidth: 64,
  outputHeight: 32,
});
assert.equal(eq.length, 64 * 32 * 4);
assert.equal(eq[0], 20);

console.log("test-globe-equirectangular: ok");
