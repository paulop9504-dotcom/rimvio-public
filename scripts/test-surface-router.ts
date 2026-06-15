#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildContext } from "../lib/context-builder/build-context";
import type { CognitiveEvent } from "../lib/context-builder/types";
import { rankContextOpportunities } from "../lib/cognitive-opportunity/rank-context-opportunities";
import { evaluateVisibility } from "../lib/visibility-bridge/evaluate-visibility";
import { routeSurfaces } from "../lib/surface-router/route-surfaces";

const NOW = 1_700_000_000_000;

const events: CognitiveEvent[] = [
  {
    id: "ec-dentist",
    type: "Event",
    timestamp: NOW - 8 * 60 * 1000,
    tags: ["schedule", "imminent", "dentist"],
    embedding: [0.9, 0.1, 0],
    engaged: true,
  },
  {
    id: "ec-followup",
    type: "Opportunity",
    timestamp: NOW - 6 * 60 * 1000,
    tags: ["schedule", "dentist"],
    embedding: [0.85, 0.15, 0],
    engaged: true,
  },
  {
    id: "ec-lunch",
    type: "Event",
    timestamp: NOW - 20 * 60 * 1000,
    tags: ["food", "suggestion"],
    embedding: [0.2, 0.7, 0.1],
    engaged: false,
  },
];

const context = buildContext(events, { now: NOW });
const { opportunities } = rankContextOpportunities({ context, eventPool: events });
const { decisions } = evaluateVisibility({ context, opportunities });
const routed = routeSurfaces({ decisions, context });

const allAssigned = [
  ...routed.surfaceMap.CALENDAR,
  ...routed.surfaceMap.DOCK,
  ...routed.surfaceMap.TIMELINE,
  ...routed.surfaceMap.NARRATION,
];

assert.equal(new Set(allAssigned).size, allAssigned.length);
assert.ok(routed.surfaceMap.CALENDAR.length <= 5);
assert.ok(routed.surfaceMap.DOCK.length <= 10);

const hiddenVisible = decisions
  .filter((decision) => !decision.visible)
  .map((decision) => decision.opportunityId);
for (const id of hiddenVisible) {
  assert.ok(routed.hidden.includes(id));
  assert.ok(!allAssigned.includes(id));
}

const scatteredContext = {
  ...context,
  attentionState: "SCATTERED" as const,
};
const scattered = routeSurfaces({ decisions, context: scatteredContext });
assert.ok(scattered.surfaceMap.CALENDAR.length <= 2);

const deterministicA = routeSurfaces({ decisions, context });
const deterministicB = routeSurfaces({ decisions, context });
assert.deepEqual(deterministicA, deterministicB);

console.log("test-surface-router: ok");
