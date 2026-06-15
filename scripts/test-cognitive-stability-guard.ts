#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { runCognitiveCycle } from "../lib/cognitive-orchestrator/run-cognitive-cycle";
import { createInitialSystemState, type EventStream } from "../lib/cognitive-orchestrator/types";
import { stabilizeCognitiveOutput } from "../lib/cognitive-stability-guard/stabilize-cognitive-output";

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

const cycle = runCognitiveCycle({
  eventStream,
  systemState: createInitialSystemState(),
  now: NOW,
});

const stable = stabilizeCognitiveOutput({
  context: cycle.context,
  opportunities: cycle.opportunities,
  visibilityDecisions: cycle.decisions,
  uiState: cycle.uiState,
  feedbackState: cycle.feedbackState,
  executionLog: cycle.executionLog,
});

assert.equal(stable.isValid, true);
assert.ok(stable.systemHealthScore >= 0.7);
assert.ok(stable.sanitizedOpportunities.length > 0);
assert.ok(stable.sanitizedDecisions.length > 0);

const clamped = stabilizeCognitiveOutput({
  context: {
    ...cycle.context,
    suppressionMap: { "ec-dentist": 1.4 },
  },
  opportunities: cycle.opportunities.map((opportunity, index) =>
    index === 0
      ? { ...opportunity, finalScore: 1.8, relevanceScore: -0.2 }
      : opportunity
  ),
  visibilityDecisions: cycle.decisions.map((decision, index) =>
    index === 0
      ? { ...decision, visibilityScore: 2, confidence: Number.NaN, surface: "INVALID" as never }
      : decision
  ),
  uiState: cycle.uiState,
});

assert.ok(clamped.warnings.includes("score_out_of_bounds_clamped"));
assert.ok(clamped.warnings.includes("pipeline_discontinuity_fixed"));
assert.equal(clamped.sanitizedOpportunities[0]!.finalScore, 1);
assert.equal(clamped.sanitizedContext.suppressionMap["ec-dentist"], 1);

const orphan = stabilizeCognitiveOutput({
  context: cycle.context,
  opportunities: cycle.opportunities,
  visibilityDecisions: [
    ...cycle.decisions,
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
  uiState: cycle.uiState,
});

assert.equal(orphan.isValid, false);
assert.ok(orphan.criticalIssues.includes("invalid_decision_mapping"));
assert.ok(orphan.warnings.includes("opportunity_orphan_detected"));

const missing = stabilizeCognitiveOutput({
  context: null,
  opportunities: null,
  visibilityDecisions: null,
  uiState: null,
});

assert.equal(missing.isValid, false);
assert.ok(missing.criticalIssues.includes("missing_context"));
assert.ok(missing.criticalIssues.includes("missing_opportunity_linkage"));
assert.deepEqual(missing.sanitizedUIState, {
  CALENDAR: [],
  DOCK: [],
  TIMELINE: [],
  NARRATION: [],
});

const density = stabilizeCognitiveOutput({
  context: { ...cycle.context, attentionState: "SCATTERED" },
  opportunities: Array.from({ length: 12 }, (_, index) => ({
    id: `opp:ec-${index}:SUGGESTION`,
    type: "SUGGESTION" as const,
    sourceEventIds: [`ec-${index}`],
    relevanceScore: index / 12,
    urgencyScore: 0.1,
    intentAlignment: 0.2,
    attentionFit: 0.3,
    finalScore: index / 12,
    recommendedSurfaceHint: "DOCK" as const,
    reasonSignals: [],
  })),
  visibilityDecisions: Array.from({ length: 12 }, (_, index) => ({
    opportunityId: `opp:ec-${index}:SUGGESTION`,
    visible: true,
    surface: "DOCK" as const,
    visibilityScore: index / 12,
    confidence: 0.5,
    finalSurface: "DOCK",
    tieBreakReason: "",
    suppressionApplied: 0,
  })),
  uiState: {
    CALENDAR: [],
    DOCK: Array.from({ length: 12 }, (_, index) => ({
      id: `opp:ec-${index}:SUGGESTION`,
      type: "SUGGESTION",
      title: `Item ${index}`,
      relevance: index / 12,
    })),
    TIMELINE: [],
    NARRATION: [],
  },
});

assert.ok(density.sanitizedUIState.DOCK.length <= 5);
assert.ok(density.warnings.includes("ui_density_reduced"));

const deterministicA = stabilizeCognitiveOutput({
  context: cycle.context,
  opportunities: cycle.opportunities,
  visibilityDecisions: cycle.decisions,
  uiState: cycle.uiState,
});
const deterministicB = stabilizeCognitiveOutput({
  context: cycle.context,
  opportunities: cycle.opportunities,
  visibilityDecisions: cycle.decisions,
  uiState: cycle.uiState,
});
assert.deepEqual(deterministicA, deterministicB);

console.log("test-cognitive-stability-guard: ok");
