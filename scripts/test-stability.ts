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
  countSurfaceKeyChanges,
  debounceSignalBatch,
  processStableRealtimeTick,
  readStabilityControlFlags,
  resetStabilityPipelineForTests,
  resolveAdaptiveBehavior,
  shouldCommitSurfaceFrame,
  commitSurfaceFrameKey,
  resetSurfaceFlutterProtectionForTests,
  computeLoadMetrics,
  recordSignalIngestBatch,
} from "@/lib/stability";
import { replayStabilityStream } from "@/lib/stability/deterministic-replay";
import { resetRealtimeOrchestratorForTests, processRealtimeTick } from "@/lib/realtime";

function resetAll() {
  resetRealtimeOrchestratorForTests();
  resetStabilityPipelineForTests();
}

function navigatePulse(id: string, strength = 0.7): import("@/lib/realtime").StreamSignal {
  return {
    signalId: id,
    kind: "navigate_pulse",
    category: "behavior",
    timestamp: new Date().toISOString(),
    strength,
  };
}

function testSignalCompression() {
  resetAll();
  const nowMs = Date.now();
  const batch = Array.from({ length: 10 }, (_, index) =>
    navigatePulse(`nav-${index}`, 0.6),
  );
  const merged = debounceSignalBatch(batch, nowMs);
  assert.equal(merged.length, 1);
  assert.ok(merged[0]!.strength >= 0.6);
}

function testLoopOscillationStress() {
  resetAll();
  const t0 = 1_700_000_000_000;
  const switches: Array<import("@/lib/loop-wiring").LoopType> = [];
  let previous: import("@/lib/realtime").RealtimeState | null = null;

  for (let index = 0; index < 12; index += 1) {
    const nowMs = t0 + index * 500;
    const wiring = index % 2 === 0 ? FIXTURE_TRANSIT_WIRING : FIXTURE_EVENING_WIRING;
    const tick = processStableRealtimeTick({
      streamSignals: [],
      wiring: { ...wiring, now: new Date(nowMs) },
      now: new Date(nowMs),
      previous,
    });
    if (tick.loopSwitched && tick.state.activeLoop) {
      switches.push(tick.state.activeLoop.loopType);
    }
    previous = tick.state;
  }

  assert.ok(switches.length <= 2, `loop thrashing switches=${switches.length}`);
}

function testRapidSignalFlood() {
  resetAll();
  const now = new Date("2026-06-07T10:00:00.000Z");
  const flood = Array.from({ length: 120 }, (_, index) =>
    navigatePulse(`flood-${index}`, 0.5),
  );
  const tick = processStableRealtimeTick({
    streamSignals: flood,
    wiring: { now, localTime: { hour: 10, minute: 0 } },
    now,
  });
  assert.equal(tick.state.lastSignals.length <= 24, true);
  const behavior = resolveAdaptiveBehavior(tick.stability.metrics, now.getTime());
  assert.ok(["HIGH", "CRITICAL", "MEDIUM"].includes(behavior.level));
  assert.ok(readStabilityControlFlags().learningPaused || behavior.learningPaused);
}

function testUiFlickerDetection() {
  resetSurfaceFlutterProtectionForTests();
  const keys: string[] = [];
  for (let index = 0; index < 20; index += 1) {
    const key = `frame-${index % 3}`;
    if (shouldCommitSurfaceFrame(key, index * 4)) {
      keys.push(key);
      commitSurfaceFrameKey(key, index * 4);
    }
  }
  const changes = countSurfaceKeyChanges(keys);
  assert.ok(changes <= 6, `flicker changes=${changes}`);
  assert.ok(keys.length <= 8, `commit count=${keys.length}`);
}

function testLoadDegradation() {
  resetAll();
  const nowMs = Date.now();
  recordSignalIngestBatch(110, nowMs);
  const metrics = computeLoadMetrics(nowMs);
  const behavior = resolveAdaptiveBehavior(metrics, nowMs);
  assert.equal(behavior.level, "CRITICAL");
  assert.equal(behavior.staticPrimaryOnly, true);
  assert.equal(behavior.freezeLoopSwitching, true);
}

function testDeterministicReplay() {
  resetAll();
  const steps = [
    {
      atMs: 1_700_000_000_000,
      signals: [navigatePulse("a")],
      wiring: { ...FIXTURE_TRANSIT_WIRING, localTime: { hour: 8, minute: 15 } },
    },
    {
      atMs: 1_700_000_008_000,
      signals: [],
      wiring: { ...FIXTURE_TRANSIT_WIRING, localTime: { hour: 8, minute: 15 } },
    },
  ];
  const a = replayStabilityStream(steps);
  resetAll();
  const b = replayStabilityStream(steps);
  assert.deepEqual(
    a.map((row) => row.activeLoop?.loopType ?? null),
    b.map((row) => row.activeLoop?.loopType ?? null),
  );
}

function testLoopDecisionLatency() {
  resetAll();
  const result = processRealtimeTick({
    device: { ...FIXTURE_TRANSIT_WIRING, localTime: { hour: 8, minute: 15 } },
    now: new Date("2026-06-07T08:15:00.000Z"),
  });
  assert.ok(result.latencyMs < 100, `latency ${result.latencyMs}ms`);
}

function testSingleActiveLoopUnderFlood() {
  resetAll();
  const now = new Date("2026-06-07T14:00:00.000Z");
  const result = processStableRealtimeTick({
    streamSignals: Array.from({ length: 50 }, (_, index) => ({
      signalId: `n-${index}`,
      kind: "notification_burst" as const,
      category: "system" as const,
      timestamp: now.toISOString(),
      strength: 0.7,
    })),
    wiring: { ...FIXTURE_INTERRUPTION_WIRING, now },
    now,
  });
  const active = result.state.activeLoop?.loopType ?? null;
  assert.ok(active);
  const others = result.state.wiring.candidates.filter(
    (row) => row.loopType !== active && row.confidenceScore >= 0.35,
  );
  assert.ok(result.state.wiring.suppressedLoops.length >= 3);
  void others;
}

function buildEngine() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const ranked = rankSurfaces(built);
  return resolveSurfaces({ surfaces: ranked, context: FIXTURE_BUILD_CONTEXT });
}

function testSurfaceOverrideUnderCritical() {
  resetAll();
  const engine = buildEngine();
  const feed = routeSurfacesToChannels(engine.surfaces, { activeChannel: "FEED" }).FEED;
  recordSignalIngestBatch(120, Date.now());
  const tick = processStableRealtimeTick({
    streamSignals: [],
    wiring: { ...FIXTURE_TRANSIT_WIRING, localTime: { hour: 8, minute: 15 } },
    now: new Date("2026-06-07T08:15:00.000Z"),
    engine,
    channelSurfaces: feed,
  });
  assert.ok(tick.composition);
  assert.ok(tick.composition.layout.primary);
  assert.equal(tick.composition.layout.secondary.length, 0);
}

testSignalCompression();
testLoopOscillationStress();
testRapidSignalFlood();
testUiFlickerDetection();
testLoadDegradation();
testDeterministicReplay();
testLoopDecisionLatency();
testSingleActiveLoopUnderFlood();
testSurfaceOverrideUnderCritical();

console.log("test-stability: ok");
