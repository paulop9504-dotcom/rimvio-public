#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  buildSurfacesFromLife,
  rankSurfaces,
  resolveSurfaces,
  routeSurfacesToChannels,
} from "@/lib/surface-engine";
import {
  FIXTURE_BUILD_CONTEXT,
  FIXTURE_LIFE_PROJECTIONS,
} from "@/lib/surface-engine/surface-test-fixtures";
import {
  FIXTURE_EVENING_WIRING,
  FIXTURE_INTERRUPTION_WIRING,
  FIXTURE_TRANSIT_WIRING,
} from "@/lib/loop-wiring/loop-test-fixtures";
import {
  decayedStrength,
  ingestStreamSignal,
  processRealtimeTick,
  pushRealtimeSignal,
  readStreamBuffer,
  resetRealtimeOrchestratorForTests,
  applyLoopSurfaceOverride,
  applyLoopStabilityGuard,
  DEFAULT_REALTIME_STABILITY,
} from "@/lib/realtime";

function resetAll() {
  resetRealtimeOrchestratorForTests();
}

function buildEngine() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const ranked = rankSurfaces(built);
  return resolveSurfaces({ surfaces: ranked, context: FIXTURE_BUILD_CONTEXT });
}

function testStreamIngestion() {
  resetAll();
  ingestStreamSignal({
    signalId: "t-1",
    kind: "notification_burst",
    category: "system",
    timestamp: new Date().toISOString(),
    strength: 0.8,
  });
  assert.equal(readStreamBuffer().length, 1);
}

function testSignalDecay() {
  const nowMs = Date.now();
  const aged = decayedStrength(1, nowMs - 8 * 60 * 1000, nowMs, "behavior");
  const fresh = decayedStrength(1, nowMs - 1000, nowMs, "behavior");
  assert.ok(aged < fresh);
  assert.ok(aged < 0.5);
}

function testLoopSwitchLatency() {
  resetAll();
  const now = new Date("2026-06-07T08:15:00.000Z");
  const result = processRealtimeTick({
    device: { ...FIXTURE_TRANSIT_WIRING, now },
    now,
    stability: { minSwitchIntervalMs: 0, scoreDeltaThreshold: 0 },
  });
  assert.ok(result.latencyMs < 300, `latency ${result.latencyMs}ms`);
  assert.equal(result.state.activeLoop?.loopType, "TRANSIT_LOOP");
}

function testSingleActiveLoop() {
  resetAll();
  const now = new Date("2026-06-07T14:00:00.000Z");
  const result = processRealtimeTick({
    device: { ...FIXTURE_INTERRUPTION_WIRING, now },
    now,
    stability: { minSwitchIntervalMs: 0, scoreDeltaThreshold: 0 },
  });
  const types = new Set(
    result.state.wiring.candidates
      .filter((row) => row.confidenceScore >= 0.35)
      .map((row) => row.loopType),
  );
  assert.ok(result.state.activeLoop);
  assert.equal(result.state.wiring.suppressedLoops.length, 3);
  assert.ok(types.size >= 1);
}

function testSurfaceOverride() {
  resetAll();
  const engine = buildEngine();
  const feed = routeSurfacesToChannels(engine.surfaces, { activeChannel: "FEED" }).FEED;
  const now = new Date("2026-06-07T08:15:00.000Z");
  const tick = processRealtimeTick({
    device: { ...FIXTURE_TRANSIT_WIRING, now },
    now,
    engine,
    channelSurfaces: feed,
    stability: { minSwitchIntervalMs: 0, scoreDeltaThreshold: 0 },
  });
  assert.ok(tick.state.surfaceOverrideKey?.includes("TRANSIT_LOOP"));
  const override = applyLoopSurfaceOverride(engine, feed, tick.state.activeLoop);
  const baselinePrimary = feed[0]?.id;
  assert.ok(override.primarySurfaceId);
  if (baselinePrimary && tick.state.activeLoop) {
    assert.ok(override.overrideKey.includes("loop:TRANSIT_LOOP"));
  }
}

function testStabilityUnderRapidSignals() {
  resetAll();
  const stability = { minSwitchIntervalMs: 8000, scoreDeltaThreshold: 0.12 };
  const now = new Date("2026-06-07T07:30:00.000Z");
  processRealtimeTick({
    device: { ...FIXTURE_EVENING_WIRING, now, localTime: { hour: 7, minute: 30 } },
    now,
    stability,
  });
  const first = processRealtimeTick({
    device: { ...FIXTURE_TRANSIT_WIRING, now: new Date(now.getTime() + 500) },
    now: new Date(now.getTime() + 500),
    stability,
  });
  const second = processRealtimeTick({
    device: { ...FIXTURE_TRANSIT_WIRING, now: new Date(now.getTime() + 1000) },
    now: new Date(now.getTime() + 1000),
    stability,
  });
  assert.equal(second.loopSwitched, false);
  assert.equal(second.state.activeLoop?.loopType, first.state.activeLoop?.loopType);
}

function testPreemptionWhenScoreHigher() {
  resetAll();
  const stability = { minSwitchIntervalMs: 0, scoreDeltaThreshold: 0.05 };
  const t0 = new Date("2026-06-07T21:00:00.000Z");
  processRealtimeTick({
    device: { ...FIXTURE_EVENING_WIRING, now: t0 },
    now: t0,
    stability,
  });
  const preempt = processRealtimeTick({
    device: { ...FIXTURE_INTERRUPTION_WIRING, now: new Date(t0.getTime() + 60_000) },
    now: new Date(t0.getTime() + 60_000),
    stability,
  });
  assert.equal(preempt.state.activeLoop?.loopType, "INTERRUPTION_LOOP");
  assert.ok(preempt.loopSwitched);
}

function testStabilityGuardUnit() {
  const proposed = {
    loopType: "TRANSIT_LOOP" as const,
    confidenceScore: 0.5,
    triggerSignals: [],
    timestamp: "t",
    contextSnapshot: {
      dateKey: "d",
      hour: 8,
      minute: 0,
    },
  };
  const current = {
    ...proposed,
    loopType: "MORNING_LOOP" as const,
    confidenceScore: 0.72,
  };
  const blocked = applyLoopStabilityGuard(
    proposed,
    current,
    Date.now() - 1000,
    Date.now(),
    DEFAULT_REALTIME_STABILITY,
  );
  assert.equal(blocked.activeLoop?.loopType, "MORNING_LOOP");

  const allowed = applyLoopStabilityGuard(
    proposed,
    current,
    Date.now() - 20_000,
    Date.now(),
    DEFAULT_REALTIME_STABILITY,
  );
  assert.equal(allowed.activeLoop?.loopType, "TRANSIT_LOOP");
}

function testPushProcessesImmediately() {
  resetAll();
  const result = pushRealtimeSignal(
    {
      signalId: "push-1",
      kind: "navigate_pulse",
      category: "behavior",
      timestamp: new Date().toISOString(),
      strength: 0.9,
    },
    {
      device: { ...FIXTURE_TRANSIT_WIRING, localTime: { hour: 8, minute: 15 } },
      stability: { minSwitchIntervalMs: 0, scoreDeltaThreshold: 0 },
    },
  );
  assert.ok(result.state.activeLoop?.loopType === "TRANSIT_LOOP");
}

testStreamIngestion();
testSignalDecay();
testLoopSwitchLatency();
testSingleActiveLoop();
testSurfaceOverride();
testStabilityUnderRapidSignals();
testPreemptionWhenScoreHigher();
testStabilityGuardUnit();
testPushProcessesImmediately();

console.log("test-realtime: ok");
