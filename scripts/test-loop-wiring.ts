#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SIGNAL_REGISTRY,
  assertNoOrphanSignalKinds,
  collectTriggerSignals,
  mergeLoopCandidates,
  resetLoopWiringStoreForTests,
  resetSignalCounterForTests,
  selectActiveLoop,
  signalToLoopCandidates,
  wireKillerLoops,
} from "@/lib/loop-wiring";
import { buildContextSnapshot } from "@/lib/loop-wiring/collect-signals";
import {
  FIXTURE_EVENING_WIRING,
  FIXTURE_GPS_ONLY,
  FIXTURE_INTERRUPTION_WIRING,
  FIXTURE_MORNING_WIRING,
  FIXTURE_TRANSIT_WIRING,
} from "@/lib/loop-wiring/loop-test-fixtures";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function resetAll() {
  resetSignalCounterForTests();
  resetLoopWiringStoreForTests();
}

function testMorningLoop() {
  resetAll();
  const frame = wireKillerLoops(FIXTURE_MORNING_WIRING);
  assert.equal(frame.activeLoop?.loopType, "MORNING_LOOP");
  assert.ok(frame.candidates.some((row) => row.loopType === "MORNING_LOOP"));
}

function testTransitLoop() {
  resetAll();
  const frame = wireKillerLoops(FIXTURE_TRANSIT_WIRING);
  assert.equal(frame.activeLoop?.loopType, "TRANSIT_LOOP");
}

function testInterruptionLoop() {
  resetAll();
  const frame = wireKillerLoops(FIXTURE_INTERRUPTION_WIRING);
  assert.equal(frame.activeLoop?.loopType, "INTERRUPTION_LOOP");
}

function testEveningLoop() {
  resetAll();
  const frame = wireKillerLoops(FIXTURE_EVENING_WIRING);
  assert.equal(frame.activeLoop?.loopType, "EVENING_LOOP");
}

function testGpsNeverPrimary() {
  resetAll();
  const frame = wireKillerLoops(FIXTURE_GPS_ONLY);
  assert.equal(frame.activeLoop, null);
  assert.equal(frame.candidates.length, 0);
}

function testGpsReinforcesTransit() {
  resetAll();
  const frame = wireKillerLoops({
    ...FIXTURE_TRANSIT_WIRING,
    location: { isMoving: true },
  });
  assert.equal(frame.activeLoop?.loopType, "TRANSIT_LOOP");
  const transit = frame.candidates.find((row) => row.loopType === "TRANSIT_LOOP");
  assert.ok((transit?.triggerSignals.length ?? 0) >= 2);
}

function testSingleActiveLoop() {
  resetAll();
  const frame = wireKillerLoops({
    ...FIXTURE_INTERRUPTION_WIRING,
    ...FIXTURE_TRANSIT_WIRING,
    now: FIXTURE_INTERRUPTION_WIRING.now,
  });
  assert.ok(frame.activeLoop);
  assert.equal(frame.suppressedLoops.length, 3);
}

function testEverySignalProducesCandidate() {
  resetAll();
  const now = new Date("2026-06-07T08:00:00.000Z");
  const wiring = { now, localTime: { hour: 8, minute: 0 }, firstUnlockToday: true };
  const signals = collectTriggerSignals(wiring);
  const context = buildContextSnapshot(wiring, now);
  const primaryTypes = new Set<import("@/lib/loop-wiring").LoopType>();
  const perSignal = signals
    .filter((row) => !row.reinforcementOnly)
    .flatMap((signal) => signalToLoopCandidates(signal, context, primaryTypes));
  assert.ok(perSignal.length >= signals.filter((s) => !s.reinforcementOnly).length);
}

function testNoOrphanSignals() {
  const kinds = SIGNAL_REGISTRY.map((row) => row.kind);
  assertNoOrphanSignalKinds(kinds);
  for (const row of SIGNAL_REGISTRY) {
    assert.ok(row.loopTypes.length >= 1);
  }
}

function testNoManualActivationInRepo() {
  const forbidden = /activateLoop\s*\(|manualLoop|triggerLoopManually/i;
  const scanRoots = ["components", "hooks", "app"].map((segment) =>
    path.join(REPO, segment),
  );
  for (const root of scanRoots) {
    if (!fs.existsSync(root)) {
      continue;
    }
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
          continue;
        }
        const source = fs.readFileSync(full, "utf8");
        assert.ok(!forbidden.test(source), `manual loop activation in ${full}`);
      }
    }
  }
}

function testDeterministicPriority() {
  resetAll();
  const candidates = mergeLoopCandidates(
    wireKillerLoops(FIXTURE_TRANSIT_WIRING).candidates,
  );
  const a = selectActiveLoop(candidates);
  const b = selectActiveLoop(candidates);
  assert.deepEqual(a.activeLoop?.loopType, b.activeLoop?.loopType);
}

testMorningLoop();
testTransitLoop();
testInterruptionLoop();
testEveningLoop();
testGpsNeverPrimary();
testGpsReinforcesTransit();
testSingleActiveLoop();
testEverySignalProducesCandidate();
testNoOrphanSignals();
testNoManualActivationInRepo();
testDeterministicPriority();

console.log("test-loop-wiring: ok");
