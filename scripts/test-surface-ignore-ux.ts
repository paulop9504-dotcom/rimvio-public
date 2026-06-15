#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { SURFACE_IGNORE_OBSERVED_EVENT } from "@/lib/surface-composition/surface-ux-events";
import { deriveLoopContextKo } from "@/lib/surface-composition/loop-why-copy";

assert.equal(SURFACE_IGNORE_OBSERVED_EVENT, "rimvio:surface-ignore-observed");
assert.ok(deriveLoopContextKo("EVENING_LOOP")?.includes("저녁"));

console.log("test-surface-ignore-ux: ok");
