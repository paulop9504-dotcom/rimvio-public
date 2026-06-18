#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { runCognitiveCycle } from "../lib/cognitive-orchestrator/run-cognitive-cycle";
import {
  createInitialSystemState,
  type EventStream,
} from "../lib/cognitive-orchestrator/types";

const NOW = 1_700_000_000_000;

const eventStream: EventStream[] = [
  {
    id: "ec-dentist",
    type: "Event",
    timestamp: NOW - 8 * 60 * 1000,
    payload: {
      tags: ["schedule", "imminent", "dentist"],
      embedding: [0.9, 0.1, 0],
      engaged: true,
    },
  },
  {
    id: "ec-followup",
    type: "Opportunity",
    timestamp: NOW - 6 * 60 * 1000,
    payload: {
      tags: ["schedule", "dentist"],
      embedding: [0.85, 0.15, 0],
      engaged: true,
    },
  },
  {
    id: "ec-lunch",
    type: "Event",
    timestamp: NOW - 20 * 60 * 1000,
    payload: {
      tags: ["food", "suggestion"],
      embedding: [0.2, 0.7, 0.1],
      engaged: false,
    },
  },
];

const baseline = runCognitiveCycle({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
});

assert.deepEqual(baseline.executionLog, [
  "step:1:context:build",
  "step:2:opportunity:rank",
  "step:3:visibility:evaluate",
  "step:4:surface:route",
  "step:5:surface:render",
  "step:6:feedback:update",
]);

assert.ok(baseline.context.now === NOW);
assert.ok(baseline.opportunities.length > 0);
assert.ok(baseline.decisions.length > 0);
assert.ok(
  baseline.uiState.CALENDAR.length +
    baseline.uiState.DOCK.length +
    baseline.uiState.TIMELINE.length +
    baseline.uiState.NARRATION.length >=
    0
);

const withFeedback = runCognitiveCycle({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
  userInteractions: [
    {
      opportunityId: baseline.opportunities[0]!.id,
      surface: "CALENDAR",
      action: "COMPLETE",
      timestamp: NOW + 1_000,
    },
  ],
});

assert.equal(withFeedback.feedbackState.driftSignals.includes("calendar_high_trust"), true);
assert.ok(withFeedback.feedbackState.surfaceBias.CALENDAR >= 0.5);

const deterministicA = runCognitiveCycle({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
});
const deterministicB = runCognitiveCycle({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
});
assert.deepEqual(deterministicA, deterministicB);

console.log("test-cognitive-orchestrator: ok");
