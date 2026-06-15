#!/usr/bin/env npx tsx
/**
 * IntentKernelResult assembly in TS; LLM only supplies kind+query.
 * Usage: npm run test:intent-kernel
 */

import assert from "node:assert/strict";
import { buildIntentKernel } from "../lib/intent/build-intent-kernel";
import {
  mapSaveToTrajectoryCluster,
  mapScreenshotKindToKernelCategory,
  primaryActionFamilyForKernel,
} from "../lib/intent/category-map";
import { collectBehaviorSignals } from "../lib/intent/collect-behavior-signals";
import { analyzeCrossLinkMemory } from "../lib/intent/cross-link-memory";
import { collectContextBehaviorSignals } from "../lib/intent/context-signals-behavior";
import { computeTrajectoryEnergy } from "../lib/intent/trajectory-energy";
import { buildConfidenceState } from "../lib/screenshot/confidence-state";
import { INTENT_KERNEL_VERSION } from "../lib/intent/kernel-version";

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

function baseState(band: "deterministic" | "assistive" | "uncertain" = "assistive") {
  return buildConfidenceState({
    score: band === "deterministic" ? 90 : band === "assistive" ? 65 : 40,
    signals: [{ id: "ocr_text_present", delta: 10 }],
    primaryReason: "test",
    sources: { regex: 1, vision: 0, llm: 0 },
    band,
  });
}

test("mapScreenshotKindToKernelCategory maps place and product", () => {
  assert.equal(mapScreenshotKindToKernelCategory({ kind: "place" }), "place");
  assert.equal(mapScreenshotKindToKernelCategory({ kind: "product" }), "commerce");
  assert.equal(
    mapScreenshotKindToKernelCategory({
      kind: "url",
      domain: "youtube.com",
    }),
    "media"
  );
});

test("computeTrajectoryEnergy picks dominant cluster with decay", () => {
  const history = [
    {
      timestamp: new Date(NOW - 30 * 60 * 1000).toISOString(),
      category: "shopping",
      title: "나이키 에어맥스",
      domain: "musinsa.com",
    },
    {
      timestamp: new Date(NOW - 20 * 60 * 1000).toISOString(),
      category: "shopping",
      title: "아디다스 슈퍼스타",
      domain: "musinsa.com",
    },
    {
      timestamp: new Date(NOW - 10 * 60 * 1000).toISOString(),
      category: "travel",
      title: "성수동 카페",
      domain: "naver.com",
    },
  ];

  const energy = computeTrajectoryEnergy(history, NOW);
  assert.equal(energy.dominant_cluster, "fashion");
  assert.ok(energy.strength > 0.4);
});

test("collectContextBehaviorSignals detects late night and save burst", () => {
  const hour = 23;
  const saveHistory = Array.from({ length: 5 }, (_, index) => ({
    timestamp: new Date(NOW - index * 2 * 60 * 1000).toISOString(),
    category: "shopping",
    title: `item-${index}`,
    domain: "coupang.com",
  }));

  const context = collectContextBehaviorSignals({
    hour,
    saveHistory,
    now: NOW,
  });

  assert.ok(context.signalIds.includes("late_night_activity"));
  assert.ok(context.signalIds.includes("save_burst"));
  assert.ok(context.signalIds.includes("repeat_domain"));
});

test("analyzeCrossLinkMemory finds comparison pattern on same domain", () => {
  const saveHistory = [
    {
      timestamp: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
      category: "shopping",
      title: "나이키 덩크 로우",
      domain: "musinsa.com",
    },
    {
      timestamp: new Date(NOW - 60 * 60 * 1000).toISOString(),
      category: "shopping",
      title: "나이키 에어맥스 90",
      domain: "musinsa.com",
    },
  ];

  const crossLink = analyzeCrossLinkMemory({
    current: {
      category: "shopping",
      domain: "musinsa.com",
      title: "나이키 조던 1",
      query: "나이키 조던 1",
    },
    saveHistory,
    now: NOW,
  });

  assert.equal(crossLink.pattern, "comparison");
  assert.ok(crossLink.related_count >= 2);
});

test("buildIntentKernel assembles full JSON without LLM actions", () => {
  const state = baseState("assistive");
  const kernel = buildIntentKernel({
    state,
    intent: {
      kind: "product",
      query: "나이키 덩크 로우",
      ocrText: "나이키 덩크 로우",
    },
    behavior: {
      hour: 23,
      saveHistory: [
        {
          timestamp: new Date(NOW - 30 * 60 * 1000).toISOString(),
          category: "shopping",
          title: "나이키 에어맥스",
          domain: "musinsa.com",
        },
      ],
      current: {
        category: "shopping",
        query: "나이키 덩크 로우",
        title: "나이키 덩크 로우",
      },
    },
    llmInvoked: true,
    llmSource: "llm",
    now: NOW,
  });

  assert.equal(kernel.v, INTENT_KERNEL_VERSION);
  assert.equal(kernel.shadow_intent.category, "commerce");
  assert.equal(kernel.shadow_intent.query, "나이키 덩크 로우");
  assert.equal(kernel.llm.invoked, true);
  assert.equal(kernel.llm.source, "llm");
  assert.equal(kernel.policy.band, "assistive");
  assert.ok(kernel.signals.length > 1);
  assert.ok(!("actions" in kernel));
});

test("primaryActionFamilyForKernel prefers price_compare for commerce", () => {
  assert.equal(
    primaryActionFamilyForKernel({
      kernelCategory: "commerce",
      band: "deterministic",
      crossLinkPattern: "none",
    }),
    "price_compare"
  );
  assert.equal(
    primaryActionFamilyForKernel({
      kernelCategory: "place",
      band: "deterministic",
      crossLinkPattern: "none",
    }),
    "map_navigate"
  );
});

test("collectBehaviorSignals merges trajectory context and cross-link signals", () => {
  const merged = collectBehaviorSignals(
    {
      hour: 23,
      saveHistory: [
        {
          timestamp: new Date(NOW - 15 * 60 * 1000).toISOString(),
          category: "shopping",
          title: "나이키",
          domain: "musinsa.com",
        },
        {
          timestamp: new Date(NOW - 10 * 60 * 1000).toISOString(),
          category: "shopping",
          title: "아디다스",
          domain: "musinsa.com",
        },
      ],
      current: {
        category: "shopping",
        domain: "musinsa.com",
        title: "퓨마 스웨이드",
        query: "퓨마 스웨이드",
      },
    },
    NOW
  );

  assert.ok(merged.signals.some((signal) => signal.id.startsWith("trajectory_")));
  assert.ok(merged.context_signal_ids.includes("late_night_activity"));
  assert.equal(mapSaveToTrajectoryCluster({ category: "shopping", title: "나이키" }), "fashion");
});

console.log(`\nIntent kernel: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
