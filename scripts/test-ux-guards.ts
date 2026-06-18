#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { detectFrustrationEscape } from "../lib/action-chat/adaptive-behavior/ux-guards/frustration-circuit-breaker";
import { isMidThoughtPivot, stripMidThoughtPivot } from "../lib/action-chat/adaptive-behavior/ux-guards/mid-thought-pivot";
import { detectImpossibleConstraints } from "../lib/action-chat/adaptive-behavior/ux-guards/impossible-constraint-handler";
import { shouldActiveListeningBypass } from "../lib/action-chat/adaptive-behavior/ux-guards/active-listening-bypass";
import { buildProactiveContextAssumption } from "../lib/action-chat/adaptive-behavior/ux-guards/proactive-context-assumption";
import { applyVitalityDecay, VITALITY_DECAY_TTL_MS } from "../lib/action-chat/adaptive-behavior/ux-guards/vitality-state-decay";
import { parseTikiChoiceBlock } from "../lib/action-chat/parse-tiki-choice-options";
import { BUSY_SCHEDULE_FIXTURE } from "../lib/testing/hardcore-red-team/adversarial-sets";

const mc = {
  currentDate: "2026-06-02T18:00:00",
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

assert.ok(detectFrustrationEscape("아 답답하네"));
assert.ok(isMidThoughtPivot("아 잠깐만 취소하고 성수동 카페"));
assert.match(stripMidThoughtPivot("아 잠깐만 취소하고 성수동 카페"), /성수동/u);
assert.ok(detectImpossibleConstraints("가성비 좋은 오마카세 추천"));
assert.ok(shouldActiveListeningBypass("너무 힘들어"));
assert.ok(buildProactiveContextAssumption("이따가 성수동 감", mc.currentDate));

const stale = applyVitalityDecay(
  { states: ["hunger"], recordedAt: new Date(Date.now() - VITALITY_DECAY_TTL_MS - 1000).toISOString() }
);
assert.equal(stale.length, 0);

async function main() {
  const frustration = await runOrchestratorPipeline({
    message: "아니 그게 아니고",
    masterContext: mc,
  });
  assert.equal(frustration.metadata?.frustration_escape, true);
  assert.equal(parseTikiChoiceBlock(frustration.summary ?? "").hasChoices, false);

  const pivot = await runOrchestratorPipeline({
    message: "아 잠깐만 쇼핑",
    history: [{ role: "user", content: "맛집 추천" }],
    masterContext: mc,
  });
  assert.notEqual(pivot.metadata?.prior_intent, "food");

  const counseling = await runOrchestratorPipeline({
    message: "요즘 너무 우울해",
    masterContext: mc,
  });
  assert.equal(counseling.metadata?.active_listening, true);
  assert.equal(parseTikiChoiceBlock(counseling.summary ?? "").hasChoices, false);

  const proactive = await runOrchestratorPipeline({
    message: "주말에 성수동 감",
    masterContext: mc,
  });
  assert.equal(proactive.metadata?.routing_patch, "UX_PROACTIVE_ASSUMPTION");
  assert.equal(parseTikiChoiceBlock(proactive.summary ?? "").hasChoices, true);

  console.log("test-ux-guards: ok");
}

void main();
