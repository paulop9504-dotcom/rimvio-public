#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { marbleStackPlacement } from "../lib/social/archive-marble-layout";

const a = marbleStackPlacement(0, 1);
const b = marbleStackPlacement(1, 2);
assert.ok(a.leftPct >= 0 && a.leftPct <= 100);
assert.ok(b.zIndex > a.zIndex);
assert.notDeepEqual(
  { x: Math.round(a.leftPct), y: Math.round(a.topPct) },
  { x: Math.round(b.leftPct), y: Math.round(b.topPct) },
);

console.log("test-archive-marble-layout: ok");
