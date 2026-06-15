#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  bridgeMediaObjectPath,
  bridgeStorageSegment,
} from "../lib/experience-bridge/bridge-media-path";

const userId = "83b07a7b-f67c-4689-b984-084f20d9814c";
const eventId = "plan:프랑스:1718000000000";
const captureId = "mc-abc-123";

const eventSeg = bridgeStorageSegment(eventId);
const captureSeg = bridgeStorageSegment(captureId);

assert.match(eventSeg, /^e_[A-Za-z0-9_-]+$/);
assert.match(captureSeg, /^[a-zA-Z0-9._-]+$/);

const path = bridgeMediaObjectPath({
  userId,
  eventId,
  captureId,
  contentType: "image/jpeg",
});

assert.doesNotMatch(path, /[:\u3131-\uD79D]/u);
assert.equal(path.split("/").length, 4);
assert.ok(path.startsWith(`${userId}/bridge/`));

console.log("test-bridge-storage-path: ok");
