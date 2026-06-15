#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { shouldForceDecisionRoute } from "../lib/action-chat/routing-patches/decision-priority-override";
import { isMealAxisQuery } from "../lib/action-chat/chat-three-axis";
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
assert.ok(!shouldForceDecisionRoute("뭐하지", "meal"));
assert.ok(isMealAxisQuery("뭐하지"));

async function main() {
  const decisionTab = await runOrchestratorPipeline({
    message: "뭐하지",
    chatAxis: "decision",
    masterContext: mc,
  });
  assert.equal(decisionTab.metadata?.chat_axis, "decision");
  assert.match(decisionTab.summary ?? "", /👉|A\)|어느|기준/u);

  const mealTab = await runOrchestratorPipeline({
    message: "뭐하지",
    chatAxis: "meal",
    masterContext: mc,
  });
  assert.equal(mealTab.metadata?.chat_axis, "meal");
  assert.notEqual(mealTab.metadata?.routing_patch, "PATCH1_DECISION_FORCE");
  assert.ok(
    mealTab.metadata?.chat_axis_route === "meal_discovery" ||
      mealTab.metadata?.chat_axis_route === "meal_search_stub" ||
      /맛집|먹/u.test(mealTab.summary ?? "")
  );

  const scheduleTab = await runOrchestratorPipeline({
    message: "내일 일정 뭐 있지",
    chatAxis: "schedule",
    masterContext: mc,
  });
  assert.equal(scheduleTab.metadata?.chat_axis, "schedule");
  assert.ok(scheduleTab.summary?.length);

  console.log("test-chat-three-axis: ok");
}

void main();
