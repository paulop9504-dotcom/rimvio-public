#!/usr/bin/env npx tsx
/**
 * System Prompt diagnosis — mirrors the 3-step checklist from Rimvio Personal OS spec.
 * Usage: npx tsx scripts/test-system-prompt-diagnosis.ts
 */

import assert from "node:assert/strict";
import {
  buildLayeredMasterOrchestratorSystemPrompt,
} from "../lib/action-chat/layered-system-prompt";
import { defaultMasterOrchestratorContext } from "../lib/action-chat/master-orchestrator-context";
import { resolveIntentRoute } from "../lib/action-chat/intent-router";
import {
  resolveOrchestratorFeatures,
} from "../lib/action-chat/feature-prompt-registry";
import { buildMasterOrchestratorSystemPrompt } from "../lib/action-chat/master-orchestrator-prompt";
import { processActionAgentBatch } from "../lib/action-chat/action-agent-batch";
import { tryPlaceConfirmation } from "../lib/action-chat/confirmation-logic";

const referenceDate = "2026-05-29";
const context = defaultMasterOrchestratorContext({
  currentDate: referenceDate,
  trustLevel: 2,
});

// ── Step 1: Brain recall (prompt must contain sequence + container + JSON rules) ──
const diagMessage = "현재 시퀀스 추출 규칙을 요약해";
const diagRoute = resolveIntentRoute({ message: diagMessage, history: [] });
const systemPrompt = buildLayeredMasterOrchestratorSystemPrompt({
  context,
  route: diagRoute,
  message: diagMessage,
});

assert.match(systemPrompt, /Current Date: 2026-05-29/, "Current Date must be injected");
assert.match(systemPrompt, /\[Current_Date\]/, "Runtime context block required");
assert.match(systemPrompt, /schedule\.tasks/, "Sequence/calendar rules present");
assert.match(systemPrompt, /container/, "Container rules present");
assert.match(systemPrompt, /ONLY valid JSON|strict JSON/i, "JSON-only discipline present");
assert.match(systemPrompt, /Engine Handoff|Vitality/i, "Engine handoff + vitality present");
assert.match(systemPrompt, /Discovery.*추천/i, "Discovery confirm guard present");
assert.match(systemPrompt, /Action Mode/i, "Action mode discipline present");

// Dynamic injection: greeting should NOT load data_cleaner / confirmation
const greetFeatures = resolveOrchestratorFeatures({
  message: "ㅎㅇ",
  referenceDate,
});
assert.deepEqual(greetFeatures, ["master_task"], "Minimal features for pure greeting");

// Place ambiguity → confirmation feature only when needed
const placeFeatures = resolveOrchestratorFeatures({
  message: "둔산동 갤러리아",
  referenceDate,
});
assert.ok(placeFeatures.includes("confirmation"), "Confirmation injected for ambiguous place");
assert.ok(!placeFeatures.includes("data_cleaner"), "Data cleaner skipped for short place query");

// ── Step 2: Parsing stress test (rule path, no OpenAI) ──
const stress =
  "오늘 오후 5시 3분에 둔산동 갤러리아 갈 거야. 그리고 010-1234-5678 저장해 놔.";

const batch = processActionAgentBatch(stress, { referenceDate });
assert.ok(batch && batch.results.length >= 2, "Batch should split place+schedule vs phone");

const scheduleTask = batch!.results.find(
  (item) => item.extracted_data.datetime || item.type === "SCHEDULE"
);
const phoneTask = batch!.results.find((item) => item.extracted_data.phone);

assert.ok(scheduleTask, "Schedule/place task extracted");
assert.ok(phoneTask, "Phone save task extracted");
assert.equal(phoneTask!.extracted_data.phone, "01012345678");

if (scheduleTask!.extracted_data.datetime) {
  assert.match(
    scheduleTask!.extracted_data.datetime,
    /^2026-05-29T17:03:00/,
    "ISO datetime for 오늘 5시 3분"
  );
}

// Mixed batch should win over place-only confirmation
const confirmOnly = tryPlaceConfirmation({ message: "둔산동 갤러리아", referenceDate });
assert.ok(confirmOnly?.confirmation?.meta.intent === "CONFIRM");

const actionPrompt = buildMasterOrchestratorSystemPrompt({
  message: stress,
  referenceDate,
});
assert.match(actionPrompt, /ACTION-ORIENTED|DatePicker/i);

console.log("test-system-prompt-diagnosis: ok");
console.log("  Step 1 — prompt contains: Current Date, schedule, container, JSON discipline");
console.log("  Step 2 — batch split:", batch!.results.map((r) => r.type).join(", "));
console.log("  Dynamic features (place):", placeFeatures.join(", "));
