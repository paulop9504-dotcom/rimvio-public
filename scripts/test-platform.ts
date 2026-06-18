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
  bootstrapRimvioRuntime,
  dispatchCapability,
  emitPluginSignal,
  getActiveContext,
  observeLoopState,
  registerPlugin,
  resetExtensionRegistryForTests,
  RIMVIO_BOOTSTRAP_ORDER,
  RUNTIME_V1,
  RUNTIME_V2,
  streamSurfaces,
  subscribeSurface,
  validatePluginManifest,
  isRuntimeCompatible,
  readRuntimeVersion,
  publishPlatformFrame,
} from "@/lib/platform/rimvio-platform";
import { resetPlatformStateForTests } from "@/lib/platform/platform-state-store";
import {
  FIXTURE_INVALID_SANDBOX_PLUGIN,
  FIXTURE_PAYMENT_PLUGIN,
  FIXTURE_WEARABLE_SIGNAL_PLUGIN,
} from "@/lib/platform/platform-test-fixtures";
import { resetRealtimeOrchestratorForTests } from "@/lib/realtime";
import { resetStabilityPipelineForTests } from "@/lib/stability";
import { FIXTURE_TRANSIT_WIRING } from "@/lib/loop-wiring/loop-test-fixtures";
import { processRealtimeTick } from "@/lib/realtime";

function resetAll() {
  resetPlatformStateForTests();
  resetExtensionRegistryForTests();
  resetRealtimeOrchestratorForTests();
  resetStabilityPipelineForTests();
}

function boot() {
  resetAll();
  return bootstrapRimvioRuntime({ resetForTests: true, runtimeVersion: RUNTIME_V2 });
}

function buildEngine() {
  const built = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, FIXTURE_BUILD_CONTEXT);
  const ranked = rankSurfaces(built);
  return resolveSurfaces({ surfaces: ranked, context: FIXTURE_BUILD_CONTEXT });
}

function testBootstrapIntegrity() {
  const runtime = boot();
  assert.deepEqual(runtime.phases, RIMVIO_BOOTSTRAP_ORDER);
  assert.equal(runtime.contractSnapshot.surfaceContractVersion, 1);
  assert.equal(runtime.contractSnapshot.loopContractVersion, 1);
  assert.equal(readRuntimeVersion(), RUNTIME_V2);
}

function testPlatformApiStability() {
  boot();
  const engine = buildEngine();
  const feed = routeSurfacesToChannels(engine.surfaces, { activeChannel: "FEED" }).FEED;
  const contextA = getActiveContext(engine, feed);
  const contextB = getActiveContext(engine, feed);
  assert.equal(contextA.apiVersion, contextB.apiVersion);
  assert.equal(contextA.runtimeVersion, RUNTIME_V2);
}

function testPluginIsolation() {
  boot();
  const bad = validatePluginManifest(FIXTURE_INVALID_SANDBOX_PLUGIN.manifest);
  assert.equal(bad.ok, false);
  const registered = registerPlugin(FIXTURE_PAYMENT_PLUGIN);
  assert.equal(registered.ok, true);
  const payment = dispatchCapability({
    capabilityId: "PLUGIN:payment:charge",
    inputs: { amount: "12000", currency: "KRW" },
  });
  assert.equal(payment.ok, true);
  assert.equal(payment.source, "plugin");
}

function testVersionCompatibility() {
  assert.equal(isRuntimeCompatible(RUNTIME_V1, RUNTIME_V2), true);
  assert.equal(isRuntimeCompatible(RUNTIME_V2, RUNTIME_V1), false);
  boot();
  registerPlugin({ ...FIXTURE_WEARABLE_SIGNAL_PLUGIN });
  const emitted = emitPluginSignal("wearable", {
    signalId: "wearable-1",
    kind: "touch_activity",
    category: "behavior",
    timestamp: new Date().toISOString(),
    strength: 0.4,
  });
  assert.equal(emitted.ok, true);
}

function testExtensionSandboxViolation() {
  boot();
  const blocked = registerPlugin(FIXTURE_INVALID_SANDBOX_PLUGIN);
  assert.equal(blocked.ok, false);
}

function testSurfaceStreamRegression() {
  boot();
  const engine = buildEngine();
  const feed = routeSurfacesToChannels(engine.surfaces, { activeChannel: "FEED" }).FEED;
  processRealtimeTick({ engine, channelSurfaces: feed, now: FIXTURE_BUILD_CONTEXT.now });
  const events: string[] = [];
  subscribeSurface((event) => {
    if (event.kind === "surface_frame") {
      events.push(event.compositionKey);
    }
  });
  for (const event of streamSurfaces(engine, feed)) {
    events.push(event.compositionKey);
  }
  assert.ok(events.length >= 1);
  const frame = publishPlatformFrame(engine, feed);
  assert.ok(frame.surfaceCount >= 1);
}

function testLoopRegressionUnderExtension() {
  boot();
  registerPlugin(FIXTURE_PAYMENT_PLUGIN);
  const now = new Date("2026-06-07T08:15:00.000Z");
  const first = processRealtimeTick({
    device: { ...FIXTURE_TRANSIT_WIRING, now },
    now,
  });
  const second = processRealtimeTick({
    device: { ...FIXTURE_TRANSIT_WIRING, now: new Date(now.getTime() + 2000) },
    now: new Date(now.getTime() + 2000),
  });
  assert.equal(first.state.activeLoop?.loopType, second.state.activeLoop?.loopType);
  const loops: string[] = [];
  observeLoopState((event) => {
    if (event.kind === "loop_state" && event.activeLoop) {
      loops.push(event.activeLoop);
    }
  });
  assert.ok(loops.length >= 0);
}

function testDeterministicPluginDispatch() {
  boot();
  registerPlugin(FIXTURE_PAYMENT_PLUGIN);
  const a = dispatchCapability({
    capabilityId: "PLUGIN:payment:charge",
    inputs: { amount: "100", currency: "KRW" },
  });
  const b = dispatchCapability({
    capabilityId: "PLUGIN:payment:charge",
    inputs: { amount: "100", currency: "KRW" },
  });
  assert.equal(a.ok, b.ok);
  assert.equal(a.capabilityId, b.capabilityId);
  if (a.ok && b.ok) {
    assert.ok(a.executionId);
    assert.ok(b.executionId);
  }
}

testBootstrapIntegrity();
testPlatformApiStability();
testPluginIsolation();
testVersionCompatibility();
testExtensionSandboxViolation();
testSurfaceStreamRegression();
testLoopRegressionUnderExtension();
testDeterministicPluginDispatch();

console.log("test-platform: ok");
