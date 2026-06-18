#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import {
  commitSessionIntent,
  resetSessionIntentStoreForTests,
} from "../lib/action-os/session-intent-state";
import { shouldForceDecisionRoute } from "../lib/action-chat/routing-patches/decision-priority-override";
import { isContextDriftInput, resolveContextDrift } from "../lib/action-chat/routing-patches/context-drift-resolver";
import { isGlobalReplanInput } from "../lib/action-chat/routing-patches/scheduling-global-replan";
import { resolveHonestRoutingSurface } from "../lib/testing/routing-stress/resolve-honest-routing-surface";
import { isVitalityStateUtterance } from "../lib/vitality-state/classify-vitality-state-intent";
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

assert.ok(shouldForceDecisionRoute("뭐하지"));
assert.ok(shouldForceDecisionRoute("추천"));
assert.ok(!shouldForceDecisionRoute("뭐하지", "meal"));
assert.ok(!isVitalityStateUtterance("뭐하지"));

const driftEmpty = resolveContextDrift("그거 비슷하게");
assert.equal(driftEmpty.kind, "clarify");

const driftFood = resolveContextDrift("그거 비슷하게", [
  { role: "user", content: "근처 맛집 추천" },
]);
assert.equal(driftFood.kind, "expand");

assert.ok(isGlobalReplanInput("내 일정 다 무시하고 새로 짜줘"));

async function expectDecision(input: string, history?: { role: "user" | "assistant"; content: string }[]) {
  const result = await runOrchestratorPipeline({
    message: input,
    history,
    masterContext: mc,
  });
  const surface = resolveHonestRoutingSurface(input, result);
  assert.notEqual(surface, "FORK", `${input} should not FORK/FOOD`);
  assert.match(result.summary ?? "", /👉|A\)|어느|기준/u);
}

async function main() {
  await expectDecision("뭐하지");
  await expectDecision("모르겠어");
  await expectDecision("추천");

  const driftNoHistory = await runOrchestratorPipeline({
    message: "대충 알아서",
    masterContext: mc,
  });
  assert.equal(driftNoHistory.metadata?.simplify_mode, true);
  assert.match(driftNoHistory.summary ?? "", /무난|바로|첫|선택/u);

  const replan = await runOrchestratorPipeline({
    message: "내 일정 다 무시하고 새로 짜줘",
    masterContext: mc,
  });
  assert.match(replan.summary ?? "", /재조정|리밸런스|RESCHEDULE/u);
  assert.equal(replan.schedule?.is_conflict !== undefined, true);
  assert.equal(replan.metadata?.global_replan_mode, "REBALANCE");

  const driftWithHistory = await runOrchestratorPipeline({
    message: "그거 비슷하게 해줘",
    history: [{ role: "user", content: "근처 맛집 추천" }],
    masterContext: mc,
  });
  assert.ok(driftWithHistory.summary?.length);

  resetSessionIntentStoreForTests("routing-correction");
  commitSessionIntent(
    {
      action_id: "NAVIGATE",
      params: { dest: "떡반집" },
      fallback_url: "https://map.naver.com",
    },
    "routing-correction"
  );
  const corrected = await runOrchestratorPipeline({
    message: "아니야 대전역으로",
    sessionScopeId: "routing-correction",
    masterContext: mc,
  });
  assert.match(
    corrected.actions[0]?.href ?? corrected.actions[0]?.url ?? "",
    /%EB%8C%80%EC%A0%84|대전/i
  );
  assert.ok(
    corrected.orchestratorTrace?.some((line) => line.includes("Correction")),
    "nav correction must beat frustration escape"
  );

  console.log("test-routing-patches: ok");
}

void main();
