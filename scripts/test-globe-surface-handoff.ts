#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  GLOBE_SURFACE_CROSSFADE_MS,
  isVectorMapInteractive,
  isVectorMapSurfaceActive,
} from "../lib/globe/globe-surface-handoff";

assert.equal(GLOBE_SURFACE_CROSSFADE_MS, 520);
assert.equal(isVectorMapSurfaceActive("globe"), false);
assert.equal(isVectorMapSurfaceActive("to-vector"), true);
assert.equal(isVectorMapInteractive("to-vector"), false);
assert.equal(isVectorMapInteractive("vector"), true);

console.log("test-globe-surface-handoff: ok");
