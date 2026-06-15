#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { enrichPlaceDiscoveryMessage } from "../lib/context-resolver/discovery/enrich-place-discovery-message";
import { expandTikiTakaChoiceReply } from "../lib/action-chat/tiki-taka-choice-reply";
import { parseTikiChoiceBlock } from "../lib/action-chat/parse-tiki-choice-options";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { inferContractAction } from "../lib/event-kernel";
const mc = {
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

assert.equal(enrichPlaceDiscoveryMessage("A) 가성비·가격"), "A) 가성비·가격");
assert.equal(inferContractAction("A) 가성비·가격"), null);

const inlineCollapsed = parseTikiChoiceBlock(
  "지금은 **이 선택이 맞는지 판단**하는 쪽으로 보여요. A) 가성비·가격\nB) 오래 쓰는 기준·품질\nC) 지금 당장 필요한 정도 👉 어느 기준이 더 중요해요?",
);
assert.equal(inlineCollapsed.choices.length, 3);
assert.equal(inlineCollapsed.choices[0]?.letter, "A");
assert.equal(inlineCollapsed.choices[0]?.text, "가성비·가격");
assert.match(inlineCollapsed.intro, /판단/);

const expanded = expandTikiTakaChoiceReply("A) 가성비·가격", [  {
    role: "assistant",
    content:
      "지금은 **뭐 먹을지 고르는** 쪽으로 보여요.\n\nA) 빠르게\nB) 맛\nC) 가볍게\n\n👉 오늘은 어느 쪽?",
  },
]);
assert.equal(expanded?.kind, "meal");
if (expanded?.kind === "meal") {
  assert.equal(expanded.query, "가성비 좋은 맛집 추천");
}

async function main() {
  const result = await runOrchestratorPipeline({
    message: "A) 가성비·가격",
    history: [
      {
        role: "assistant",
        content:
          "지금은 **뭐 먹을지 고르는** 쪽으로 보여요.\n\nA) 빠르게 (국밥·분식)\nB) 맛 기준\nC) 가볍게\n\n👉 오늘은 어느 쪽이 더 끌려요?",
      },
    ],
    masterContext: mc,
  });
  assert.ok(!result.entityQuickPick);
  assert.ok(result.cafeDiscovery?.options?.length || /가성비|맛집/u.test(result.summary ?? ""));
  console.log("test-tiki-taka-choice: ok");
}

void main();
