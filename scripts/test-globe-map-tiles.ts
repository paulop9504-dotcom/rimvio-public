#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildGlobeMapTileGrid,
  resolveGlobeMapZoom,
} from "../lib/experience-graph/build-globe-map-tiles";

const jeju = buildGlobeMapTileGrid(33.389, 126.553, 6, 5, "satellite");
assert.equal(jeju.tiles.length, 25);
assert.match(jeju.tiles[0]!.url, /\/api\/globe\/tile/);
assert.ok(jeju.focalOffsetX >= 512 && jeju.focalOffsetX < 768);
assert.ok(jeju.focalOffsetY >= 512 && jeju.focalOffsetY < 768);
assert.equal(jeju.gridPx, 5 * 256);

const voyager = buildGlobeMapTileGrid(37.5665, 126.978, 8, 3, "voyager");
assert.equal(voyager.tiles.length, 9);
assert.match(voyager.tiles[0]!.url, /style=voyager/);

const flatDirect = buildGlobeMapTileGrid(37.5665, 126.978, 14, 5, "voyager", "direct");
assert.equal(flatDirect.tiles.length, 25);
assert.match(flatDirect.tiles[0]!.url, /cartocdn\.com\/rastertiles\/voyager/);

assert.equal(resolveGlobeMapZoom(1.85, "satellite"), 7);
assert.equal(resolveGlobeMapZoom(1.85, "voyager"), 11);

console.log("test-globe-map-tiles: ok");
