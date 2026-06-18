#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildContext } from "../lib/context-builder/build-context";
import type { CognitiveEvent } from "../lib/context-builder/types";
import { rankContextOpportunities } from "../lib/cognitive-opportunity/rank-context-opportunities";
import { renderSurfaceUi } from "../lib/surface-render-contract/render-surface-ui";
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
];

const context = buildContext(events, { now: NOW });
const { opportunities } = rankContextOpportunities({ context, eventPool: events });
const { decisions } = evaluateVisibility({ context, opportunities });
const rendered = renderSurfaceUi({ decisions, opportunities, eventPool: events });

assert.ok(rendered.uiState.CALENDAR.length <= 5);
assert.ok(rendered.uiState.DOCK.length <= 10);
assert.ok(rendered.uiState.TIMELINE.length <= 7);
assert.ok(rendered.uiState.NARRATION.length <= 5);

const allIds = [
  ...rendered.uiState.CALENDAR.map((item) => item.id),
  ...rendered.uiState.DOCK.map((item) => item.id),
  ...rendered.uiState.TIMELINE.map((item) => item.id),
  ...rendered.uiState.NARRATION.map((item) => item.id),
];
assert.equal(new Set(allIds).size, allIds.length);

for (const decision of decisions.filter((entry) => !entry.visible)) {
  assert.ok(!allIds.includes(decision.opportunityId));
}

const dentistDecision = decisions.find((decision) => decision.opportunityId.includes("ec-dentist"));
assert.ok(dentistDecision);

if (dentistDecision.visible && dentistDecision.surface === "CALENDAR") {
  const calendarItem = rendered.uiState.CALENDAR.find((item) => item.id === dentistDecision.opportunityId);
  assert.ok(calendarItem);
  assert.match(calendarItem.title.toLowerCase(), /dentist/);
  assert.equal(calendarItem.timestamp, NOW - 8 * 60 * 1000);
  assert.equal(calendarItem.urgency, opportunities.find((opp) => opp.id === calendarItem.id)?.urgencyScore);
}

const dockItem = rendered.uiState.DOCK[0];
if (dockItem) {
  const opp = opportunities.find((entry) => entry.id === dockItem.id);
  assert.ok(opp);
  assert.equal(dockItem.relevance, opp.finalScore);
}

const narrationDecision = decisions.find(
  (decision) => decision.visible && decision.surface === "NARRATION"
);
if (narrationDecision) {
  const narrationItem = rendered.uiState.NARRATION.find((item) => item.id === narrationDecision.opportunityId);
  assert.ok(narrationItem);
  assert.ok(narrationItem.text.length > 0);
  assert.ok(!narrationItem.text.toLowerCase().includes("action"));
}

const deterministicA = renderSurfaceUi({ decisions, opportunities, eventPool: events });
const deterministicB = renderSurfaceUi({ decisions, opportunities, eventPool: events });
assert.deepEqual(deterministicA, deterministicB);

console.log("test-surface-render-contract: ok");
