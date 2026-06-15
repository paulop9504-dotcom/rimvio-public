#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildContext } from "../lib/context-builder/build-context";
import type { CognitiveEvent } from "../lib/context-builder/types";
import { rankContextOpportunities } from "../lib/cognitive-opportunity/rank-context-opportunities";

const NOW = 1_700_000_000_000;

const events: CognitiveEvent[] = [
  {
    id: "ec-dentist",
    type: "Event",
    timestamp: NOW - 10 * 60 * 1000,
    tags: ["schedule", "imminent", "dentist"],
    embedding: [0.9, 0.1, 0],
    engaged: true,
  },
  {
    id: "ec-promo",
    type: "Notification",
    timestamp: NOW - 2 * 60 * 60 * 1000,
    tags: ["promo"],
    embedding: [0, 0.1, 0.9],
    engaged: false,
  },
];

const context = buildContext(events, { now: NOW });
const result = rankContextOpportunities({ context, eventPool: events });

assert.ok(result.opportunities.length >= 1);
assert.ok(result.opportunities.length <= 10);

const top = result.opportunities[0]!;
assert.equal(top.sourceEventIds[0], "ec-dentist");
assert.ok(top.finalScore >= top.relevanceScore * 0.3);
assert.ok(top.finalScore <= 1);
assert.ok(["ACTION", "REMINDER"].includes(top.type));
assert.ok(top.recommendedSurfaceHint === "CALENDAR" || top.recommendedSurfaceHint === "DOCK");

const suppressedContext = {
  ...context,
  suppressionMap: { ...context.suppressionMap, "ec-promo": 0.95 },
};
const suppressed = rankContextOpportunities({
  context: suppressedContext,
  eventPool: events,
});
assert.ok(!suppressed.opportunities.some((item) => item.sourceEventIds.includes("ec-promo")));

const idleContext = {
  ...context,
  attentionState: "IDLE" as const,
  suppressionMap: { "ec-promo": 0.5 },
};
const idle = rankContextOpportunities({
  context: idleContext,
  eventPool: events,
});
const reengage = idle.opportunities.find((item) => item.type === "REENGAGEMENT");
assert.ok(reengage || idle.opportunities.length > 0);

const deterministicA = rankContextOpportunities({ context, eventPool: events });
const deterministicB = rankContextOpportunities({ context, eventPool: events });
assert.deepEqual(deterministicA, deterministicB);

console.log("test-cognitive-opportunity: ok");
