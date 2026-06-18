#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { detectEntityOnlyInput } from "../lib/event-kernel/entity/entity-action-surface";
import { classifyAiIntentUtterance } from "../lib/action-chat/classify-ai-intent-utterance";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { resolveHonestRoutingSurface } from "../lib/testing/routing-stress/resolve-honest-routing-surface";

const masterContext = {
  currentDate: "2026-06-02",
  trustLevel: "L1" as const,
  existingSchedule: [],
  allReminders: [],
  userGoals: [],
  activitySources: [],
  conversationMemories: [],
  activeContainers: [],
  activeChains: [],
  activeChain: null,
  userDefinedActions: [],
  mapApp: "kakao" as const,
};

for (const message of ["옷사야함", "옷 사야함"]) {
  assert.equal(detectEntityOnlyInput(message), null, `${message} not entity-only`);
  assert.equal(classifyAiIntentUtterance(message), "HOW_TO", `${message} → HOW_TO`);
}

assert.equal(classifyAiIntentUtterance("신발 추천해줘"), "DECISION");

async function main() {
  const result = await runOrchestratorPipeline({
    message: "옷사야함",
    masterContext,
  });
  assert.ok(!result.entityQuickPick, "no entity card");
  assert.equal(resolveHonestRoutingSurface("옷사야함", result), "STEP");
  assert.match(result.summary ?? "", /A\)|👉/);
  console.log("test-shopping-intent: ok");
}

void main();
