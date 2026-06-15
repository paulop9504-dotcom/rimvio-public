#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveGlobeTileUpstreamUrl } from "../lib/experience-graph/resolve-globe-tile-upstream";

const satellite = resolveGlobeTileUpstreamUrl({ z: 6, x: 54, y: 26, style: "satellite" });
assert.match(satellite!, /World_Imagery/);

const voyager = resolveGlobeTileUpstreamUrl({ z: 8, x: 210, y: 95, style: "voyager" });
assert.match(voyager!, /\.basemaps\.cartocdn\.com\/rastertiles\/voyager/);

console.log("test-globe-tile-upstream: ok");
