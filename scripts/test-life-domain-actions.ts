#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  buildLifeDomainActions,
  detectLifeDomain,
  LIFE_DOMAIN_CATALOG,
  orchestrateLifeDomainActions,
} from "../lib/life-domain-actions";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";

assert.equal(LIFE_DOMAIN_CATALOG.length, 7);

for (const entry of LIFE_DOMAIN_CATALOG) {
  assert.equal(entry.actions.length, 10, `${entry.key} must have 10 actions`);
  const built = buildLifeDomainActions(entry.key);
  assert.equal(built.length, 10);
  assert.ok(built.every((action) => action.label.length >= 2));
  assert.ok(built.some((action) => action.payload?.action_tier === "MAIN"));
}

assert.equal(detectLifeDomain("오늘 학습 집중 모드 켜줘"), "study");
assert.equal(detectLifeDomain("업무 브리핑 보여줘"), "work");
assert.equal(detectLifeDomain("여행 환율 확인"), "travel");

const study = orchestrateLifeDomainActions("Study 학습 도와줘");
assert.ok(study);
assert.equal(study!.actions.length, 10);
assert.match(study!.summary, /학습/);

async function main() {
  const pipeline = await runOrchestratorPipeline({
    message: "Health 건강 액션",
    masterContext: {
      currentDate: "2026-06-02",
      trustLevel: "L1",
      existingSchedule: [],
      allReminders: [],
      userGoals: [],
      activitySources: [],
      conversationMemories: [],
      activeContainers: [],
      activeChains: [],
      activeChain: null,
      userDefinedActions: [],
      mapApp: "kakao",
    },
  });
  assert.equal(pipeline.actions.length, 10);
  assert.equal(pipeline.metadata?.semantic_reason, "life_domain_actions");
  assert.equal(pipeline.metadata?.life_domain, "health");
  console.log("test-life-domain-actions: ok");
}

void main();
