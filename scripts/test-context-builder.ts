#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildContext } from "../lib/context-builder/build-context";
import type { CognitiveEvent } from "../lib/context-builder/types";

const NOW = 1_700_000_000_000;
const HALF_HOUR = 30 * 60 * 1000;

function embed(values: number[]): number[] {
  return values;
}

const focusedStream: CognitiveEvent[] = [
  {
    id: "e1",
    type: "Event",
    timestamp: NOW - 5 * 60 * 1000,
    tags: ["schedule", "dentist"],
    embedding: embed([1, 0, 0]),
    engaged: true,
  },
  {
    id: "e2",
    type: "Opportunity",
    timestamp: NOW - 8 * 60 * 1000,
    tags: ["schedule", "imminent"],
    embedding: embed([0.9, 0.1, 0]),
    engaged: true,
  },
];

const focused = buildContext(focusedStream, { now: NOW });
assert.equal(focused.attentionState, "FOCUSED");
assert.ok(focused.activeIntents.includes("schedule"));
assert.equal(focused.userIntentVector.length, 3);
assert.ok(focused.recentTopSignals.length >= 2);
assert.equal(focused.suppressionMap.e1, undefined);

const scatteredStream: CognitiveEvent[] = [
  ...focusedStream,
  {
    id: "e3",
    type: "Notification",
    timestamp: NOW - 2 * 60 * 1000,
    tags: ["finance", "receipt"],
    embedding: embed([0, 1, 0]),
    engaged: false,
  },
  {
    id: "e4",
    type: "Container",
    timestamp: NOW - 3 * 60 * 1000,
    tags: ["travel", "flight"],
    embedding: embed([0, 0, 1]),
    engaged: false,
  },
  {
    id: "e5",
    type: "Behavior",
    timestamp: NOW - 4 * 60 * 1000,
    tags: ["food", "lunch"],
    embedding: embed([0.2, 0.2, 0.6]),
    engaged: false,
  },
  {
    id: "e6",
    type: "Event",
    timestamp: NOW - 6 * 60 * 1000,
    tags: ["social", "party"],
    embedding: embed([0.1, 0.3, 0.6]),
    engaged: false,
  },
];

const scattered = buildContext(scatteredStream, { now: NOW });
assert.equal(scattered.attentionState, "SCATTERED");

const idle = buildContext([], { now: NOW });
assert.equal(idle.attentionState, "IDLE");
assert.deepEqual(idle.userIntentVector, []);

const ignored: CognitiveEvent[] = [
  {
    id: "n1",
    type: "Notification",
    timestamp: NOW - HALF_HOUR * 3,
    tags: ["promo", "ignored"],
    embedding: embed([0, 0, 1]),
    engaged: false,
  },
  {
    id: "n2",
    type: "Notification",
    timestamp: NOW - HALF_HOUR * 2.5,
    tags: ["promo"],
    embedding: embed([0, 0, 1]),
    engaged: false,
  },
];

const suppressed = buildContext(ignored, { now: NOW });
assert.ok((suppressed.suppressionMap.n1 ?? 0) >= 0.9);
assert.ok((suppressed.suppressionMap.n2 ?? 0) >= 0.45);

const deterministicA = buildContext(focusedStream, { now: NOW });
const deterministicB = buildContext(focusedStream, { now: NOW });
assert.deepEqual(deterministicA, deterministicB);

console.log("test-context-builder: ok");
