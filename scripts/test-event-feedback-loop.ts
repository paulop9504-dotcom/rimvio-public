#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { processEventFeedback } from "../lib/event-feedback-loop/process-feedback";
import type {
  CurrentSystemState,
  UserInteractionEvent,
} from "../lib/event-feedback-loop/types";

const NOW = 1_700_000_000_000;

const baseState: CurrentSystemState = {
  suppressionMap: {},
  surfaceBias: {
    CALENDAR: 0.5,
    DOCK: 0.5,
    TIMELINE: 0.5,
    NARRATION: 0.5,
  },
  opportunityHistory: {},
  attentionState: "IDLE",
};

const dismissEvents: UserInteractionEvent[] = [
  {
    opportunityId: "opp:ec-promo:SUGGESTION",
    surface: "DOCK",
    action: "DISMISS",
    timestamp: NOW,
  },
];

const dismissed = processEventFeedback({ events: dismissEvents, state: baseState });
assert.equal(dismissed.updatedSuppressionMap["ec-promo"], 0.3);
assert.ok(dismissed.updatedSurfaceBias.DOCK < baseState.surfaceBias.DOCK!);

const engagedEvents: UserInteractionEvent[] = [
  {
    opportunityId: "opp:ec-dentist:REMINDER",
    surface: "CALENDAR",
    action: "COMPLETE",
    timestamp: NOW,
  },
  {
    opportunityId: "opp:ec-followup:ACTION",
    surface: "CALENDAR",
    action: "CLICK",
    timestamp: NOW + 1_000,
  },
];

const engaged = processEventFeedback({ events: engagedEvents, state: baseState });
assert.equal(engaged.updatedSuppressionMap["ec-dentist"], 0);
assert.ok(engaged.updatedSurfaceBias.CALENDAR > baseState.surfaceBias.CALENDAR!);
assert.equal(engaged.attentionState, "FOCUSED");
assert.ok(engaged.driftSignals.includes("calendar_high_trust"));

const scatteredEvents: UserInteractionEvent[] = [
  {
    opportunityId: "opp:ec-a:SUGGESTION",
    surface: "DOCK",
    action: "IGNORE",
    timestamp: NOW,
  },
  {
    opportunityId: "opp:ec-b:SUGGESTION",
    surface: "CALENDAR",
    action: "IGNORE",
    timestamp: NOW + 500,
  },
  {
    opportunityId: "opp:ec-c:SUGGESTION",
    surface: "TIMELINE",
    action: "DISMISS",
    timestamp: NOW + 1_000,
  },
  {
    opportunityId: "opp:ec-d:SUGGESTION",
    surface: "NARRATION",
    action: "IGNORE",
    timestamp: NOW + 1_500,
  },
];

const scattered = processEventFeedback({
  events: scatteredEvents,
  state: { ...baseState, attentionState: "FOCUSED" },
});
assert.equal(scattered.attentionState, "SCATTERED");
assert.ok(scattered.driftSignals.includes("attention_fragmentation"));
assert.ok(scattered.driftSignals.includes("narration_ignored"));

const timelineDwell: UserInteractionEvent[] = [
  {
    opportunityId: "opp:ec-trip:ACTION",
    surface: "TIMELINE",
    action: "HOVER_LONG",
    dwellTime: 4_500,
    timestamp: NOW,
  },
];

const timeline = processEventFeedback({ events: timelineDwell, state: baseState });
assert.ok(timeline.updatedSurfaceBias.TIMELINE > baseState.surfaceBias.TIMELINE!);
assert.ok(timeline.driftSignals.includes("timeline_engaged"));

const clampState: CurrentSystemState = {
  ...baseState,
  suppressionMap: { "ec-heavy": 0.85 },
};
const clampEvents: UserInteractionEvent[] = [
  {
    opportunityId: "opp:ec-heavy:REMINDER",
    surface: "DOCK",
    action: "DISMISS",
    timestamp: NOW,
  },
];
const clamped = processEventFeedback({ events: clampEvents, state: clampState });
assert.equal(clamped.updatedSuppressionMap["ec-heavy"], 1);

const deterministicA = processEventFeedback({ events: scatteredEvents, state: baseState });
const deterministicB = processEventFeedback({ events: scatteredEvents, state: baseState });
assert.deepEqual(deterministicA, deterministicB);

console.log("test-event-feedback-loop: ok");
