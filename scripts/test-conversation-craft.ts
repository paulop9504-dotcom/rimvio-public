#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolveAdaptiveBehaviorContext } from "../lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import { resolveConversationCraft } from "../lib/action-chat/conversation-craft/detect-craft-signals";
import {
  buildCraftTikiOfflineReply,
  enhanceZeigarnikClosing,
} from "../lib/action-chat/conversation-craft/build-craft-reply";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { parseTikiChoiceBlock } from "../lib/action-chat/parse-tiki-choice-options";
import { BUSY_SCHEDULE_FIXTURE } from "../lib/testing/hardcore-red-team/adversarial-sets";

const mc = {
  currentDate: "2026-06-06T18:00:00",
  trustLevel: "L1" as const,
  existingSchedule: [
    { time: "15:00", task: "강남역 미팅" },
    ...BUSY_SCHEDULE_FIXTURE,
  ],
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

const adaptiveL1 = resolveAdaptiveBehaviorContext({ message: "뭐 먹지" });
assert.ok(adaptiveL1.craft.techniques.includes("alternative_choice"));

const adaptiveTravel = resolveAdaptiveBehaviorContext({ message: "이번 주말 부산 여행" });
assert.ok(adaptiveTravel.craft.techniques.includes("assumptive_close"));

const adaptiveBoredom = resolveAdaptiveBehaviorContext({ message: "뭐하지" });
assert.ok(adaptiveBoredom.craft.techniques.includes("vitality_quick_react"));
assert.ok(adaptiveBoredom.craft.vitalityReact?.length);

const craftMeal = buildCraftTikiOfflineReply("뭐 먹지", "DECISION", adaptiveL1.craft, []);
assert.ok(craftMeal?.includes("국물"));
assert.ok(parseTikiChoiceBlock(craftMeal ?? "").hasChoices);

const zeig = enhanceZeigarnikClosing("요약\n\n👉 어느 쪽?", "맛집 추천");
assert.match(zeig, /식사 후/u);

const zeroHistory = [
  { role: "user" as const, content: "가성비 좋은 거" },
  { role: "assistant" as const, content: "A) 가성비" },
];
const adaptiveZero = resolveAdaptiveBehaviorContext({
  message: "성수동 뭐 먹지",
  history: zeroHistory,
});
assert.ok(adaptiveZero.craft.techniques.includes("zero_step"));

const crossAdaptive = resolveAdaptiveBehaviorContext({
  message: "배고픈데",
  existingSchedule: mc.existingSchedule,
});
assert.ok(crossAdaptive.craft.techniques.includes("cross_domain_stitch"));

const counseling = resolveAdaptiveBehaviorContext({ message: "요즘 너무 우울해" });
assert.equal(counseling.craft.techniques.length, 0);

async function main() {
  const assumptive = await runOrchestratorPipeline({
    message: "이번 주말 부산 여행",
    masterContext: mc,
  });
  assert.ok(
    (assumptive.metadata as { craft_techniques?: string[] })?.craft_techniques?.includes(
      "assumptive_close"
    )
  );

  const mealAxis = await runOrchestratorPipeline({
    message: "뭐 먹지",
    chatAxis: "meal",
    masterContext: mc,
  });
  assert.ok(mealAxis.summary);

  console.log("test-conversation-craft: ok");
}

void main();
