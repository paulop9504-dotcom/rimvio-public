#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { isDecisionAvoidanceInput } from "../lib/action-chat/adaptive-behavior/detect-decision-avoidance";
import { resolveAdaptiveBehaviorContext } from "../lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import { repairContextDrift } from "../lib/action-chat/adaptive-behavior/context-repair";
import { parseTikiChoiceBlock } from "../lib/action-chat/parse-tiki-choice-options";
import { BUSY_SCHEDULE_FIXTURE } from "../lib/testing/hardcore-red-team/adversarial-sets";

const mc = {
  currentDate: "2026-06-02",
  trustLevel: "L1" as const,
  existingSchedule: BUSY_SCHEDULE_FIXTURE,
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

assert.ok(isDecisionAvoidanceInput("그냥 알아서 해줘"));
assert.ok(isDecisionAvoidanceInput("너가 골라줘"));

const autoCtx = resolveAdaptiveBehaviorContext({ message: "대충 괜찮은 걸로" });
assert.equal(autoCtx.autoDecide, true);
assert.equal(autoCtx.simplifyMode, true);

const boredomCtx = resolveAdaptiveBehaviorContext({ message: "오늘 뭐하지" });
assert.ok(boredomCtx.hiddenIntents.includes("boredom"));

const repair = repairContextDrift("그거 비슷한데 다른 거", [
  { role: "user", content: "근처 맛집 추천" },
  { role: "assistant", content: "국밥 어때요?" },
]);
assert.equal(repair.kind, "reconstructed");
if (repair.kind === "reconstructed") {
  assert.ok(repair.confidence >= 0.5);
}

async function main() {
  const autoDecide = await runOrchestratorPipeline({
    message: "그냥 알아서 해줘",
    masterContext: mc,
  });
  assert.equal(autoDecide.metadata?.simplify_mode, true);
  assert.equal(parseTikiChoiceBlock(autoDecide.summary ?? "").hasChoices, false);

  const stillTiki = await runOrchestratorPipeline({
    message: "뭐하지",
    chatAxis: "decision",
    masterContext: mc,
  });
  assert.equal(stillTiki.metadata?.routing_patch, "PATCH1_DECISION_FORCE");
  assert.ok(
    stillTiki.metadata?.simplify_mode !== true ||
      parseTikiChoiceBlock(stillTiki.summary ?? "").hasChoices ||
      /무난|바로|제일/u.test(stillTiki.summary ?? "")
  );

  const driftSimplify = await runOrchestratorPipeline({
    message: "대충 알아서",
    masterContext: mc,
  });
  assert.equal(driftSimplify.metadata?.simplify_mode, true);
  assert.equal(parseTikiChoiceBlock(driftSimplify.summary ?? "").hasChoices, false);

  console.log("test-adaptive-behavior: ok");
}

void main();
