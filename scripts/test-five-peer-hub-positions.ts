#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  clampHubPoint,
  defaultHubNodePositions,
  resolveHubDragBounds,
} from "../lib/context/five-peer-hub-positions";

const defaults = defaultHubNodePositions();
assert.equal(defaults.center.x, 50);
assert.equal(defaults.center.y, 46);
assert.equal(Object.keys(defaults.slots).length, 5);
assert.ok(defaults.archiveBag.y > defaults.center.y);
assert.ok(defaults.archiveBag.x > 0);

const clamped = clampHubPoint({ x: 0, y: 100 }, { minX: 4, maxX: 96, minY: 4, maxY: 96 });
assert.equal(clamped.x, 4);
assert.equal(clamped.y, 96);

const phonePortrait = resolveHubDragBounds(360, 640, "peer");
assert.ok(phonePortrait.minX > 0 && phonePortrait.maxX < 100);
assert.ok(phonePortrait.minY <= 10, "portrait should allow wide vertical drag");
assert.ok(phonePortrait.maxY >= 88, "portrait should allow wide vertical drag");

const desktopWide = resolveHubDragBounds(900, 520, "center");
assert.ok(desktopWide.maxX - desktopWide.minX > 80);
assert.ok(desktopWide.maxY - desktopWide.minY > 75);

const reread = defaultHubNodePositions();
assert.ok(reread.slots[2]!.x > 0);
assert.ok(reread.slots[2]!.y > 0);

console.log("test-five-peer-hub-positions: ok");
