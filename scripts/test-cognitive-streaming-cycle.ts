#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  createInitialStreamingSystemState,
  createStreamingRuntime,
  DEFAULT_TICK_CONFIG,
} from "../lib/cognitive-streaming-cycle/types";
import { runStreamingTick } from "../lib/cognitive-streaming-cycle/run-streaming-tick";
import type { EventStream } from "../lib/cognitive-orchestrator/types";

const NOW = 1_700_000_000_000;

function dentistEvent(timestamp: number): EventStream {
  return {
    id: "ec-dentist",
    type: "Event",
    timestamp,
    payload: {
      tags: ["schedule", "imminent", "dentist"],
      embedding: [0.9, 0.1, 0],
      engaged: true,
    },
  };
}

function lunchEvent(timestamp: number): EventStream {
  return {
    id: "ec-lunch",
    type: "Event",
    timestamp,
    payload: {
      tags: ["food", "suggestion"],
      embedding: [0.2, 0.7, 0.1],
      engaged: false,
    },
  };
}

let runtime = createStreamingRuntime(NOW);
let systemState = createInitialStreamingSystemState();

const tick1 = runStreamingTick({
  incomingEvents: [dentistEvent(NOW - 1_000)],
  systemState,
  tickConfig: DEFAULT_TICK_CONFIG,
  runtime,
  now: NOW,
});

assert.match(tick1.result.tickId, /^tick-1-/);
assert.ok(tick1.result.processedEvents.includes("ec-dentist"));
assert.equal(tick1.result.uiCommit, true);
assert.ok(tick1.result.frameDiff.added.length >= 0);
assert.ok(tick1.result.executionLog.includes("commit:guard:stabilize"));

runtime = tick1.runtime;
systemState = tick1.systemState;

const tick2 = runStreamingTick({
  incomingEvents: [lunchEvent(NOW + 500)],
  systemState,
  tickConfig: DEFAULT_TICK_CONFIG,
  runtime,
  now: NOW + 1_000,
});

assert.equal(tick2.result.uiCommit, true);
assert.ok(tick2.result.processedEvents.includes("ec-lunch"));

runtime = tick2.runtime;
systemState = tick2.systemState;

const tick3 = runStreamingTick({
  incomingEvents: [],
  systemState,
  tickConfig: DEFAULT_TICK_CONFIG,
  runtime,
  now: NOW + 2_000,
});

assert.equal(tick3.result.uiCommit, false);
assert.deepEqual(tick3.result.frameDiff, { added: [], removed: [], updated: [] });
assert.ok(tick3.result.executionLog.includes("tick:commit:skipped"));

const debounced = runStreamingTick({
  incomingEvents: [
    dentistEvent(NOW + 2_100),
    dentistEvent(NOW + 2_150),
    dentistEvent(NOW + 2_180),
  ],
  systemState: createInitialStreamingSystemState(),
  tickConfig: {
    intervalMs: 1_000,
    maxEventsPerTick: 10,
    debounceWindowMs: 500,
  },
  runtime: createStreamingRuntime(NOW + 2_000),
  now: NOW + 3_000,
});

assert.equal(new Set(debounced.runtime.eventPool.map((event) => event.id)).size, 1);

const deterministicA = runStreamingTick({
  incomingEvents: [dentistEvent(NOW), lunchEvent(NOW + 100)],
  systemState: createInitialStreamingSystemState(),
  tickConfig: DEFAULT_TICK_CONFIG,
  runtime: createStreamingRuntime(NOW),
  now: NOW,
});
const deterministicB = runStreamingTick({
  incomingEvents: [dentistEvent(NOW), lunchEvent(NOW + 100)],
  systemState: createInitialStreamingSystemState(),
  tickConfig: DEFAULT_TICK_CONFIG,
  runtime: createStreamingRuntime(NOW),
  now: NOW,
});
assert.deepEqual(deterministicA.result, deterministicB.result);

console.log("test-cognitive-streaming-cycle: ok");
