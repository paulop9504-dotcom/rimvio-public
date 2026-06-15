#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { decideEventBehaviors } from "../lib/behavior-engine/decide-event-behaviors";
import { listEventBehaviors } from "../lib/behavior-engine/list-event-behaviors";
import type { EventOpportunitySignal } from "../lib/opportunity-engine/types";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import type { EventCandidate } from "../lib/events/event-candidate";

const now = new Date("2026-06-01T16:30:00");

const highImminent: EventOpportunitySignal = {
  ecId: "ec-high",
  score: 0.91,
  reason: "치과: active now, imminent",
  priority: "HIGH",
};

const medium: EventOpportunitySignal = {
  ecId: "ec-medium",
  score: 0.55,
  reason: "미팅: scheduled",
  priority: "MEDIUM",
};

const lowIrrelevant: EventOpportunitySignal = {
  ecId: "ec-low",
  score: 0.3,
  reason: "헬스장",
  priority: "LOW",
};

const highBehavior = decideEventBehaviors([highImminent])!;
assert.notEqual(highBehavior, "NO_ACTION");
assert.equal(highBehavior[0]?.show_in_dock, true);
assert.equal(highBehavior[0]?.highlight, "HIGH");
assert.equal(highBehavior[0]?.auto_nudge, true);
assert.equal(highBehavior[0]?.notification, true);

const mediumBehavior = decideEventBehaviors([medium])!;
assert.equal(mediumBehavior[0]?.highlight, "MEDIUM");
assert.equal(mediumBehavior[0]?.auto_nudge, false);

const suppressed = decideEventBehaviors([lowIrrelevant])!;
assert.equal(suppressed[0]?.suppress, true);
assert.equal(suppressed[0]?.show_in_dock, false);

const focused = decideEventBehaviors([medium], { focusedEcId: "ec-medium" })!;
assert.equal(focused[0]?.highlight, "HIGH");

assert.equal(decideEventBehaviors([]), "NO_ACTION");
assert.equal(decideEventBehaviors([{ ...medium, ecId: "bad-id" }]), "NO_ACTION");

const ts = now.toISOString();
resetEventCandidatesForTests([
  {
    id: "ec-pipeline",
    title: "치과",
    category: "schedule",
    source: "message",
    lifecycle: "active",
    datetime: "2026-06-01T17:00:00",
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  } satisfies EventCandidate,
]);

const pipeline = listEventBehaviors({ now, maxResults: 3 });
assert.notEqual(pipeline, "NO_ACTION");
assert.ok(Array.isArray(pipeline));
assert.equal(pipeline[0]?.ecId, "ec-pipeline");

resetEventCandidatesForTests([]);
console.log("test-behavior-engine: ok");
