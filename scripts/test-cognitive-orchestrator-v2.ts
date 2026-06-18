#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { executeCognitivePipeline } from "../lib/cognitive-orchestrator/execute-pipeline";
import {
  applyCommitGate,
  runCognitiveCycleV2,
} from "../lib/cognitive-orchestrator/run-cognitive-cycle-v2";
import {
  createInitialFeedbackState,
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

const approved = runCognitiveCycleV2({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
});

assert.equal(approved.isValid, true);
assert.equal(approved.uiCommit, true);
assert.ok(approved.opportunities.length > 0);
assert.ok(approved.executionLog.includes("commit:guard:stabilize"));
assert.ok(approved.executionLog.includes("commit:ui:approved"));

const withFeedback = runCognitiveCycleV2({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
  userInteractions: [
    {
      opportunityId: approved.opportunities[0]!.id,
      surface: "CALENDAR",
      action: "COMPLETE",
      timestamp: NOW + 1_000,
    },
  ],
});

assert.ok(withFeedback.feedbackState.driftSignals.includes("calendar_high_trust"));
assert.equal(withFeedback.uiCommit, true);

const { draft, executionLog } = executeCognitivePipeline({ eventStream, now: NOW });
const blocked = applyCommitGate({
  draft: {
    ...draft,
    decisions: [
      ...draft.decisions,
      {
        opportunityId: "opp:missing:ACTION",
        visible: true,
        surface: "DOCK",
        visibilityScore: 0.5,
        confidence: 0.5,
        finalSurface: "DOCK",
        tieBreakReason: "",
        suppressionApplied: 0,
      },
    ],
  },
  feedbackState: createInitialFeedbackState(),
  executionLog: [...executionLog, "step:6:feedback:update"],
});

assert.equal(blocked.isValid, false);
assert.equal(blocked.uiCommit, false);
assert.deepEqual(blocked.uiState, {
  CALENDAR: [],
  DOCK: [],
  TIMELINE: [],
  NARRATION: [],
});
assert.ok(blocked.executionLog.includes("commit:ui:blocked"));
assert.ok(blocked.criticalIssues.includes("invalid_decision_mapping"));

const deterministicA = runCognitiveCycleV2({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
});
const deterministicB = runCognitiveCycleV2({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
});
assert.deepEqual(deterministicA, deterministicB);

console.log("test-cognitive-orchestrator-v2: ok");
