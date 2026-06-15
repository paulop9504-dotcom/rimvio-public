#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  assertStabilityInvariants,
  buildSurfacesFromLife,
  collapseOverloadedSurfaces,
  rankSurfaces,
  stabilizeSurfaceLayer,
  UX_MAX_TOP_SURFACES,
} from "@/lib/surface-engine";
import { hasStartHereSurface } from "@/lib/surface-engine/surface-fallback";
import { countVisibleSurfaces, detectSurfaceUxState } from "@/lib/surface-engine/surface-ux-state";
import {
  FIXTURE_BUILD_CONTEXT,
  FIXTURE_EMPTY_LIFE,
  FIXTURE_LIFE_PROJECTIONS,
  FIXTURE_LOW_SIGNAL_LIFE,
  FIXTURE_OVERLOAD_LIFE,
} from "@/lib/surface-engine/surface-test-fixtures";

const FORBIDDEN_UX_COPY = [
  /projection/i,
  /capability/i,
  /execution/i,
  /enqueue/i,
  /provider/i,
  /SSOT/i,
];

function testEmptyStateInvariant() {
  const { surfaces, uxState } = stabilizeSurfaceLayer([], {
    life: FIXTURE_EMPTY_LIFE,
    context: FIXTURE_BUILD_CONTEXT,
  });
  assert.ok(surfaces.length >= 1);
  assert.equal(uxState, "empty");
  assert.ok(hasStartHereSurface(surfaces));
  assertStabilityInvariants(surfaces);
}

function testIdleFallback() {
  const built = buildSurfacesFromLife(FIXTURE_EMPTY_LIFE, FIXTURE_BUILD_CONTEXT);
  const { surfaces, uxState } = stabilizeSurfaceLayer(built, {
    life: FIXTURE_EMPTY_LIFE,
    context: FIXTURE_BUILD_CONTEXT,
  });
  assert.ok(surfaces.some((row) => row.id.includes(":idle") || row.id.includes("start-here")));
  assert.ok(surfaces[0]?.primaryAction.label.length > 0);
  assert.ok(uxState === "empty" || uxState === "idle");
}

function testLowSignalMerge() {
  const built = buildSurfacesFromLife(FIXTURE_LOW_SIGNAL_LIFE, FIXTURE_BUILD_CONTEXT);
  const state = detectSurfaceUxState(built, FIXTURE_LOW_SIGNAL_LIFE, FIXTURE_BUILD_CONTEXT);
  assert.equal(state, "low_signal");
  const { surfaces } = stabilizeSurfaceLayer(built, {
    life: FIXTURE_LOW_SIGNAL_LIFE,
    context: FIXTURE_BUILD_CONTEXT,
  });
  const travelVisible = surfaces.filter(
    (row) => row.type === "travel" && row.visibility !== "hidden",
  );
  assert.ok(travelVisible.length <= 1);
  const dominant = travelVisible[0];
  assert.ok(dominant);
  assert.equal(dominant.primaryAction.kind, "primary");
  assert.ok(
    dominant.narration?.reason === "low_signal_merge" ||
      dominant.primaryAction.capabilityId === "BOOK_FLIGHT",
  );
}

function testOverloadCollapse() {
  const built = buildSurfacesFromLife(FIXTURE_OVERLOAD_LIFE, FIXTURE_BUILD_CONTEXT);
  assert.ok(built.length > UX_MAX_TOP_SURFACES);
  const collapsed = collapseOverloadedSurfaces(
    built.map((row) => ({
      ...row,
      priority: { ...row.priority, band: row.priority.band },
    })),
  );
  const prominent = collapsed.filter(
    (row) => row.visibility === "prominent" || row.visibility === "normal",
  );
  assert.ok(prominent.length <= UX_MAX_TOP_SURFACES + 2);
  const { surfaces, uxState } = stabilizeSurfaceLayer(built, {
    life: FIXTURE_OVERLOAD_LIFE,
    context: FIXTURE_BUILD_CONTEXT,
  });
  assert.equal(uxState, "overloaded");
  assert.ok(countVisibleSurfaces(surfaces) >= 1);
  assertStabilityInvariants(surfaces);
}

function testSinglePrimaryEnforcement() {
  const { surfaces } = stabilizeSurfaceLayer(
    buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT),
    { life: FIXTURE_LIFE_PROJECTIONS, context: FIXTURE_BUILD_CONTEXT },
  );
  for (const surface of surfaces) {
    assert.equal(surface.primaryAction.kind, "primary");
    assert.ok(
      surface.secondaryActions.every((action) => action.kind === "secondary"),
      surface.id,
    );
  }
}

function testFallbackSurfaceGuarantee() {
  const { surfaces } = stabilizeSurfaceLayer([], {
    life: FIXTURE_EMPTY_LIFE,
    context: { now: new Date("2026-06-07T08:00:00.000Z") },
  });
  const start = surfaces.find((row) => row.id.includes("start-here"));
  assert.ok(start);
  assert.equal(start.primaryAction.capabilityId, "CALENDAR");
  assert.ok(start.secondaryActions.some((a) => a.capabilityId === "SEARCH"));
  assert.ok(start.secondaryActions.some((a) => a.capabilityId === "CLARIFY_GOAL"));
}

function testNoInterpretationUx() {
  const { surfaces } = stabilizeSurfaceLayer(
    buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT),
    { life: FIXTURE_LIFE_PROJECTIONS, context: FIXTURE_BUILD_CONTEXT },
  );
  const copy = surfaces
    .flatMap((row) => [
      row.title,
      row.description,
      row.primaryAction.label,
      row.narration?.summary ?? "",
    ])
    .join("\n");
  for (const pattern of FORBIDDEN_UX_COPY) {
    assert.ok(!pattern.test(copy), `forbidden UX copy: ${pattern}`);
  }
}

function testDeterministicStability() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const a = stabilizeSurfaceLayer(built, {
    life: FIXTURE_LIFE_PROJECTIONS,
    context: FIXTURE_BUILD_CONTEXT,
  }).surfaces.map((row) => row.id);
  const b = stabilizeSurfaceLayer(built, {
    life: FIXTURE_LIFE_PROJECTIONS,
    context: FIXTURE_BUILD_CONTEXT,
  }).surfaces.map((row) => row.id);
  assert.deepEqual(a, b);
  const ranked = rankSurfaces(
    stabilizeSurfaceLayer(built, {
      life: FIXTURE_LIFE_PROJECTIONS,
      context: FIXTURE_BUILD_CONTEXT,
    }).surfaces,
  );
  assert.ok(ranked.length >= 1);
}

testEmptyStateInvariant();
testIdleFallback();
testLowSignalMerge();
testOverloadCollapse();
testSinglePrimaryEnforcement();
testFallbackSurfaceGuarantee();
testNoInterpretationUx();
testDeterministicStability();

console.log("test-surface-ux-stability: ok");
