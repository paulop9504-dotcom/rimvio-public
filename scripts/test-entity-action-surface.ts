#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  buildEntityActionSurface,
  classifyEntityInputState,
  detectEntityOnlyInput,
  guessEntityType,
  rankBucketsForGuess,
} from "../lib/event-kernel/entity/entity-action-surface";
import {
  orchestrateEntityQuickPick,
  isBareBrandUtterance,
} from "../lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import {
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
} from "../lib/event-kernel";

const violations: string[] = [];

function expect(condition: boolean, message: string) {
  if (!condition) {
    violations.push(message);
  }
}

// CASE 1 — 삼성전자
const samsung = buildEntityActionSurface("삼성전자");
expect(samsung?.state === "ENTITY_ONLY", "CASE1: ENTITY_ONLY");
expect(guessEntityType("삼성전자").entityType === "COMPANY", "CASE1: COMPANY type");
const samsungBuckets = rankBucketsForGuess(guessEntityType("삼성전자"));
expect(samsungBuckets.includes("NEWS"), "CASE1: NEWS bucket");
expect(samsungBuckets.includes("PRODUCTS"), "CASE1: PRODUCTS bucket");
expect(samsungBuckets.includes("CAREERS"), "CASE1: CAREERS bucket");
expect(
  (samsung?.suggestions ?? []).some((s) => /뉴스|제품|채용|기업/.test(s.label)),
  "CASE1: UI labels"
);

// CASE 2 — 쿠우쿠우
const kuu = buildEntityActionSurface("쿠우쿠우");
expect(kuu?.entityType === "RESTAURANT", "CASE2: RESTAURANT type");
expect(
  (kuu?.suggestions ?? []).some((s) => s.bucket === "PRICE"),
  "CASE2: PRICE bucket"
);
expect(
  (kuu?.suggestions ?? []).some((s) => s.bucket === "RESERVATION"),
  "CASE2: RESERVATION bucket"
);

// CASE 3 — 스타벅스
const sbux = buildEntityActionSurface("스타벅스");
expect(
  sbux?.entityType === "RESTAURANT" || sbux?.entityType === "BRAND",
  "CASE3: RESTAURANT or BRAND"
);
expect(
  (sbux?.suggestions ?? []).some((s) => /매장|영업|메뉴|가격/.test(s.label)),
  "CASE3: location/menu oriented"
);

// CASE 4 — 응 (no surface)
expect(classifyEntityInputState("응") === "NOT_ENTITY_ONLY", "CASE4: not ENTITY_ONLY");
expect(detectEntityOnlyInput("응") === null, "CASE4: no detection");
expect(isBareBrandUtterance("응") === false, "CASE4: no bare brand");

// Kernel decision must stay CLARIFY — surface is presentation-only
resetKernelMemoryStoreForTests();
const kernelBefore = runEventKernelOS({ message: "쿠우쿠우", history: [] });
const decisionBefore = kernelBefore.kernel.committedDecision;
const kernelAfter = runEventKernelOS({ message: "쿠우쿠우", history: [] });
expect(kernelAfter.kernel.committedDecision === decisionBefore, "kernel decision unchanged");
expect(kernelAfter.kernelDecision.state === kernelBefore.kernelDecision.state, "intent state unchanged");
expect(kernelAfter.entityActionSurface !== null, "surface attached");
if (decisionBefore === "CLARIFY" && kernelAfter.output.disposition === "terminal") {
  expect(kernelAfter.output.summary.includes("쿠우쿠우"), "CLARIFY overlay summary");
  expect(kernelAfter.output.actions.length >= 3, "CLARIFY overlay actions");
}

// Quick pick bridge
const quick = orchestrateEntityQuickPick("삼성전자");
assert.ok(quick?.entityQuickPick);
assert.match(quick!.summary!, /삼성전자/);

const report = {
  status: violations.length === 0 ? "PASS" : "FAIL",
  entity_detection: violations.some((v) => v.startsWith("CASE"))
    ? "FAIL"
    : "OK",
  action_surface: violations.length === 0 ? "OK" : "FAIL",
  violations,
};

console.log(JSON.stringify(report, null, 2));
if (violations.length > 0) {
  process.exit(1);
}
