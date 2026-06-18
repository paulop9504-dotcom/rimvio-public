#!/usr/bin/env npx tsx
/**
 * Behavior telemetry: burst session, metadata vessel, kernel snapshot attach.
 * Usage: npm run test:behavior-telemetry
 */

import assert from "node:assert/strict";
import { buildUserActionMetadata, EMPTY_INFERRED } from "../lib/personalization/action-metadata";
import { attachKernelSnapshot } from "../lib/intent/kernel-snapshot";
import {
  BURST_THRESHOLD,
  BURST_WINDOW_MS,
  computeBurstSession,
  recentTrajectorySaves,
} from "../lib/intent/burst-session";
import { collectContextBehaviorSignals } from "../lib/intent/context-signals-behavior";
import { UNDONE_WINDOW_MS } from "../lib/personalization/client-store";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

const NOW = Date.parse("2026-05-25T23:30:00.000Z");

test("burst session triggers at 10m / 5 saves", () => {
  const history = Array.from({ length: BURST_THRESHOLD }, (_, index) => ({
    timestamp: new Date(NOW - index * 60 * 1000).toISOString(),
    category: "shopping",
    title: `save-${index}`,
    domain: "coupang.com",
  }));

  const burst = computeBurstSession({ history, activeBurst: null, now: NOW });
  assert.equal(burst.is_burst_session, true);
  assert.equal(burst.burst_count, BURST_THRESHOLD);
  assert.equal(burst.burst_window_ms, BURST_WINDOW_MS);
  assert.ok(burst.burst_session_id);
});

test("recentTrajectorySaves drops entries outside burst window", () => {
  const history = [
    {
      timestamp: new Date(NOW - BURST_WINDOW_MS - 1000).toISOString(),
      category: "shopping",
      title: "old",
      domain: "coupang.com",
    },
    {
      timestamp: new Date(NOW - 60 * 1000).toISOString(),
      category: "shopping",
      title: "new",
      domain: "coupang.com",
    },
  ];

  assert.equal(recentTrajectorySaves(history, NOW).length, 1);
});

test("collectContextBehaviorSignals uses unified burst threshold", () => {
  const saveHistory = Array.from({ length: BURST_THRESHOLD }, (_, index) => ({
    timestamp: new Date(NOW - index * 2 * 60 * 1000).toISOString(),
    category: "shopping",
    title: `item-${index}`,
    domain: "coupang.com",
  }));

  const context = collectContextBehaviorSignals({
    hour: 23,
    saveHistory,
    now: NOW,
  });

  assert.ok(context.signalIds.includes("save_burst"));
});

test("buildUserActionMetadata keeps inferred emotion null vessel", () => {
  const metadata = buildUserActionMetadata(
    {
      category: "shopping",
      domain: "joongna.com",
      title: "아이폰 15",
      source_type: "commerce",
    },
    {
      chip_id: "true_cost_receipt",
      dwell_time_ms: 4200,
      time_to_action_ms: 900,
      receipt_visible: true,
    },
    NOW
  );

  assert.deepEqual(metadata.inferred, EMPTY_INFERRED);
  assert.equal(metadata.dwell_time_ms, 4200);
  assert.equal(metadata.time_to_action_ms, 900);
  assert.ok(metadata.kernel_snapshot);
});

test("attachKernelSnapshot marks burst on dense trajectory", () => {
  const saveHistory = Array.from({ length: BURST_THRESHOLD }, (_, index) => ({
    timestamp: new Date(NOW - index * 60 * 1000).toISOString(),
    category: "shopping",
    title: `item-${index}`,
    domain: "musinsa.com",
  }));

  const snapshot = attachKernelSnapshot({
    saveHistory,
    link: {
      category: "shopping",
      domain: "musinsa.com",
      title: "나이키",
      source_type: "commerce",
    },
    now: NOW,
  });

  assert.equal(snapshot.is_burst_session, true);
  assert.ok(snapshot.burst_session_id);
  assert.ok(snapshot.interaction_mode);
});

test("UNDONE_WINDOW_MS is 60 seconds", () => {
  assert.equal(UNDONE_WINDOW_MS, 60_000);
});

console.log(`\nBehavior telemetry: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
