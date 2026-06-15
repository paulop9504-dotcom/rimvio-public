#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { executeCognitivePipeline } from "../lib/cognitive-orchestrator/execute-pipeline";
import type { EventStream } from "../lib/cognitive-orchestrator/types";
import {
  toSurfaceRenderInputs,
  toSurfaceRouterOutputs,
  toSurfaceTruthDecisions,
  unifySurfaceTruth,
} from "../lib/surface-truth-unifier/unify-surface-truth";

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

const { draft } = executeCognitivePipeline({ eventStream, now: NOW });

const unified = unifySurfaceTruth({
  decisions: toSurfaceTruthDecisions(draft.decisions, draft.opportunities),
  routerOutputs: toSurfaceRouterOutputs(draft.surfaceRoute),
  renderInputs: toSurfaceRenderInputs(draft.uiState),
  context: {
    attentionState: draft.context.attentionState,
    suppressionMap: draft.context.suppressionMap,
  },
});

const allAssigned = [
  ...unified.unifiedSurfaceMap.CALENDAR,
  ...unified.unifiedSurfaceMap.DOCK,
  ...unified.unifiedSurfaceMap.TIMELINE,
  ...unified.unifiedSurfaceMap.NARRATION,
];

assert.equal(new Set(allAssigned).size, allAssigned.length);

for (const decision of draft.decisions.filter((entry) => entry.visible)) {
  assert.ok(allAssigned.includes(decision.opportunityId));
  const conflict = unified.conflictsResolved.find(
    (entry) => entry.opportunityId === decision.opportunityId
  );
  if (conflict) {
    assert.equal(conflict.selectedSurface, decision.surface ?? conflict.selectedSurface);
    assert.ok(conflict.resolutionReason.length > 0);
  }
}

const manual = unifySurfaceTruth({
  decisions: [
    {
      opportunityId: "opp:a:ACTION",
      visible: true,
      surface: "CALENDAR",
      recommendedSurfaceHint: "DOCK",
    },
  ],
  routerOutputs: [{ opportunityId: "opp:a:ACTION", routedSurface: "DOCK" }],
  renderInputs: [{ opportunityId: "opp:a:ACTION", renderSurface: "TIMELINE" }],
  context: { attentionState: "SCATTERED", suppressionMap: {} },
});

assert.deepEqual(manual.unifiedSurfaceMap.CALENDAR, ["opp:a:ACTION"]);
assert.equal(manual.conflictsResolved.length, 1);
assert.deepEqual(manual.conflictsResolved[0]!.conflictSources, ["SurfaceRender", "SurfaceRouter"]);
assert.equal(manual.conflictsResolved[0]!.selectedSurface, "CALENDAR");
assert.ok(manual.ignoredSurfaces.SurfaceRouter.includes("opp:a:ACTION"));
assert.ok(manual.ignoredSurfaces.SurfaceRender.includes("opp:a:ACTION"));

const fallback = unifySurfaceTruth({
  decisions: [
    {
      opportunityId: "opp:b:SUGGESTION",
      visible: true,
      surface: null,
      recommendedSurfaceHint: "TIMELINE",
    },
  ],
  routerOutputs: [],
  renderInputs: [],
  context: { attentionState: "IDLE", suppressionMap: {} },
});

assert.deepEqual(fallback.unifiedSurfaceMap.TIMELINE, ["opp:b:SUGGESTION"]);
assert.equal(fallback.conflictsResolved.length, 0);

const dockFallback = unifySurfaceTruth({
  decisions: [
    {
      opportunityId: "opp:c:SUGGESTION",
      visible: true,
      surface: null,
      recommendedSurfaceHint: "invalid",
    },
  ],
  routerOutputs: [],
  renderInputs: [],
  context: { attentionState: "IDLE", suppressionMap: {} },
});

assert.deepEqual(dockFallback.unifiedSurfaceMap.DOCK, ["opp:c:SUGGESTION"]);

const deterministicA = unifySurfaceTruth({
  decisions: toSurfaceTruthDecisions(draft.decisions, draft.opportunities),
  routerOutputs: toSurfaceRouterOutputs(draft.surfaceRoute),
  renderInputs: toSurfaceRenderInputs(draft.uiState),
  context: {
    attentionState: draft.context.attentionState,
    suppressionMap: draft.context.suppressionMap,
  },
});
const deterministicB = unifySurfaceTruth({
  decisions: toSurfaceTruthDecisions(draft.decisions, draft.opportunities),
  routerOutputs: toSurfaceRouterOutputs(draft.surfaceRoute),
  renderInputs: toSurfaceRenderInputs(draft.uiState),
  context: {
    attentionState: draft.context.attentionState,
    suppressionMap: draft.context.suppressionMap,
  },
});
assert.deepEqual(deterministicA, deterministicB);

console.log("test-surface-truth-unifier: ok");
