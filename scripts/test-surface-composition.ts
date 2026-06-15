#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  composeSurfaceFrame,
  collapseSurfaceDecisionStream,
  resetSurfaceCollapseStateForTests,
} from "@/lib/surface-composition";
import { buildSurfaceGraph } from "@/lib/surface-composition/build-surface-graph";
import { assertCompositionInvariants } from "@/lib/surface-composition/composition-invariants";
import { resolveCompositionLayout } from "@/lib/surface-composition/resolve-composition-layout";
import { resolveSurfaces } from "@/lib/surface-engine";
import {
  FIXTURE_EMPTY_LIFE,
  FIXTURE_LIFE_PROJECTIONS,
  FIXTURE_OVERLOAD_LIFE,
} from "@/lib/surface-engine/surface-test-fixtures";

function testPrimarySlotAlwaysFilled() {
  const engine = resolveSurfaces({ dateKey: "2026-06-07" });
  const frame = composeSurfaceFrame(engine, engine.routes.FEED);
  assert.ok(frame.layout.primary, "primary slot required");
  assertCompositionInvariants(frame.layout);
}

function testEmptyUxStartHere() {
  const engine = resolveSurfaces({
    dateKey: FIXTURE_EMPTY_LIFE.dateKey,
    context: { now: new Date("2026-06-07T10:00:00.000Z") },
  });
  const frame = composeSurfaceFrame(engine, engine.routes.FEED);
  assert.ok(frame.layout.primary);
  const mfe = frame.layout.primary?.mfeId;
  assert.ok(mfe === "StartHereSurfaceMF" || mfe === "IdleSurfaceMF" || mfe === "GenericSurfaceMF");
}

function testOverloadedCollapsesToSingleActive() {
  resetSurfaceCollapseStateForTests();
  const engine = resolveSurfaces({
    dateKey: FIXTURE_OVERLOAD_LIFE.dateKey,
    context: { now: new Date("2026-06-07T10:00:00.000Z") },
  });
  const graph = buildSurfaceGraph(engine, engine.routes.FEED);
  assert.equal(graph.nodes.length, 1);
  assert.notEqual(graph.nodes[0]?.mfeId, "SurfaceStackCollapsedMF");
  if (engine.uxState === "overloaded") {
    assert.ok(graph.latentSurfaces.length >= 1);
  }
}

function testSinglePrimaryMfe() {
  resetSurfaceCollapseStateForTests();
  const engine = resolveSurfaces({ dateKey: "2026-06-07" });
  const layout = resolveCompositionLayout(
    buildSurfaceGraph(engine, engine.routes.FEED),
  );
  assert.equal(layout.secondary.length, 0);
  const primaryMfe = layout.primary?.mfeId;
  assert.ok(primaryMfe);
  assert.notEqual(primaryMfe, "SurfaceStackCollapsedMF");
}

function testCollapseArgmax() {
  resetSurfaceCollapseStateForTests();
  const engine = resolveSurfaces({
    dateKey: FIXTURE_LIFE_PROJECTIONS.dateKey,
    context: { now: new Date("2026-06-07T10:00:00.000Z") },
  });
  const visible = engine.routes.FEED.filter((row) => row.visibility !== "hidden");
  const collapsed = collapseSurfaceDecisionStream(visible, { uxState: engine.uxState });
  assert.ok(collapsed.activeSurface);
  if (visible.length > 1) {
    assert.ok(collapsed.latentSurfaces.length >= 1);
    const topScore = collapsed.activeSurface!.priority.surfacePriorityScore;
    for (const latent of collapsed.latentSurfaces) {
      assert.ok(latent.priority.surfacePriorityScore <= topScore);
    }
  }
}

function testDeterministicFrame() {
  resetSurfaceCollapseStateForTests();
  const engine = resolveSurfaces({ dateKey: "2026-06-07" });
  const a = composeSurfaceFrame(engine, engine.routes.FEED);
  const b = composeSurfaceFrame(engine, engine.routes.FEED);
  assert.equal(a.layout.primary?.id, b.layout.primary?.id);
  assert.equal(a.layout.secondary.length, 0);
  assert.equal(b.layout.secondary.length, 0);
  assert.deepEqual(a.collapse.latentSurfaceIds, b.collapse.latentSurfaceIds);
}

function testFixtureLifeGraph() {
  const engine = resolveSurfaces({
    dateKey: FIXTURE_LIFE_PROJECTIONS.dateKey,
    context: { now: new Date("2026-06-07T10:00:00.000Z") },
  });
  const frame = composeSurfaceFrame(engine, engine.routes.FEED);
  assert.ok(frame.graph.nodes.length >= 1);
  assert.ok(frame.layout.actionDockCapabilities.length >= 1);
}

testPrimarySlotAlwaysFilled();
testEmptyUxStartHere();
testOverloadedCollapsesToSingleActive();
testCollapseArgmax();
testSinglePrimaryMfe();
testDeterministicFrame();
testFixtureLifeGraph();

console.log("test-surface-composition: ok");
