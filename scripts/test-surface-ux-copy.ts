#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { deriveSurfaceWhyLineKo } from "@/lib/surface-composition/surface-why-copy";
import { deriveLoopContextKo } from "@/lib/surface-composition/loop-why-copy";
import { derivePrimarySuccessMessage } from "@/lib/surface-composition/surface-success-copy";
import { resolveSurfaces } from "@/lib/surface-engine";
import { composeSurfaceFrame } from "@/lib/surface-composition";

const engine = resolveSurfaces({ dateKey: "2026-06-07" });
const frame = composeSurfaceFrame(engine, engine.routes.FEED);
const primary = frame.layout.primary;
assert.ok(primary);

const why = deriveSurfaceWhyLineKo({ node: primary, frame });
assert.ok(why && why.length > 0);

const success = derivePrimarySuccessMessage("BOOK_FLIGHT", primary);
assert.match(success, /숙소/);

assert.ok(deriveLoopContextKo("TRANSIT_LOOP")?.includes("이동"));

console.log("test-surface-ux-copy: ok");
