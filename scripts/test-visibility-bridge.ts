#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildContext } from "../lib/context-builder/build-context";
import type { CognitiveEvent } from "../lib/context-builder/types";
import { rankContextOpportunities } from "../lib/cognitive-opportunity/rank-context-opportunities";
import { evaluateVisibility } from "../lib/visibility-bridge/evaluate-visibility";

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
  {
    id: "ec-promo",
    type: "Notification",
    timestamp: NOW - 3 * 60 * 60 * 1000,
    tags: ["promo"],
    embedding: [0, 0, 1],
    engaged: false,
  },
];

const context = buildContext(events, { now: NOW });
const { opportunities } = rankContextOpportunities({ context, eventPool: events });
const result = evaluateVisibility({ context, opportunities });

assert.ok(result.decisions.length <= 10);
assert.ok(result.decisions.every((decision) => decision.visibilityScore >= 0));
assert.ok(result.decisions.every((decision) => decision.confidence >= 0));

const dentist = result.decisions.find((decision) => decision.opportunityId.includes("ec-dentist"));
assert.ok(dentist);
assert.equal(dentist.visible, true);
assert.ok(dentist.surface === "CALENDAR" || dentist.surface === "TIMELINE");

const suppressedContext = {
  ...context,
  suppressionMap: { ...context.suppressionMap, "ec-promo": 0.95 },
};
const suppressedOpps = rankContextOpportunities({
  context: suppressedContext,
  eventPool: events,
}).opportunities;
const suppressed = evaluateVisibility({
  context: suppressedContext,
  opportunities: suppressedOpps,
});
const promo = suppressed.decisions.find((decision) =>
  decision.opportunityId.includes("ec-promo")
);
if (promo) {
  assert.equal(promo.visible, false);
  assert.equal(promo.finalSurface, "none");
}

const scatteredContext = {
  ...context,
  attentionState: "SCATTERED" as const,
  activeIntents: ["schedule", "food", "promo", "social"],
};
const scatteredEvents: CognitiveEvent[] = [
  ...events,
  {
    id: "ec-travel",
    type: "Event",
    timestamp: NOW - 2 * 60 * 1000,
    tags: ["travel", "flight"],
    embedding: [0, 0.2, 0.8],
    engaged: false,
  },
  {
    id: "ec-social",
    type: "Behavior",
    timestamp: NOW - 3 * 60 * 1000,
    tags: ["social", "party"],
    embedding: [0.1, 0.3, 0.6],
    engaged: false,
  },
];
const scatteredOpps = rankContextOpportunities({
  context: scatteredContext,
  eventPool: scatteredEvents,
}).opportunities;
const scattered = evaluateVisibility({
  context: scatteredContext,
  opportunities: scatteredOpps,
});
const visibleScattered = scattered.decisions.filter((decision) => decision.visible);
assert.ok(visibleScattered.length <= 2);

const deterministicA = evaluateVisibility({ context, opportunities });
const deterministicB = evaluateVisibility({ context, opportunities });
assert.deepEqual(deterministicA, deterministicB);

console.log("test-visibility-bridge: ok");
