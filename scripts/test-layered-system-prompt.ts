#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildLayeredMasterOrchestratorSystemPrompt,
  buildLayeredSystemPromptPayload,
  deriveCurrentTask,
  deriveRelevantContext,
  formatLayeredSystemPromptBlock,
} from "../lib/action-chat/layered-system-prompt";
import { defaultMasterOrchestratorContext } from "../lib/action-chat/master-orchestrator-context";
import { resolveIntentRoute } from "../lib/action-chat/intent-router";

const context = defaultMasterOrchestratorContext({
  currentDate: "2026-05-29",
  trustLevel: 2,
  existingSchedule: [{ time: "19:00", task: "가족 모임" }],
  activeContainers: [
    {
      id: "c1",
      title: "부산 여행 준비",
      topic: "travel",
      itemCount: 3,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      lastOpenedAt: "2026-05-20T00:00:00.000Z",
      archivedAt: null,
    },
    {
      id: "c2",
      title: "쿠우쿠우 맛집 정리",
      topic: "dining",
      itemCount: 2,
      createdAt: "2026-05-10T00:00:00.000Z",
      updatedAt: "2026-05-15T00:00:00.000Z",
      lastOpenedAt: "2026-05-15T00:00:00.000Z",
      archivedAt: null,
    },
  ],
});

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 맛집" },
];

const message = "내일 오후 7시 대전 월드컵 경기장 일정 잡아줘";
const route = resolveIntentRoute({
  message,
  history: [...diningHistory, { role: "user", content: message }],
  linkTitle: "쿠우쿠우 도안점",
});

const payload = buildLayeredSystemPromptPayload({
  context,
  route,
  message,
  linkTitle: null,
  userPreferencesOverride: "자차 이용 선호, 조용한 맛집 선호",
});

assert.match(payload.GLOBAL_MEMORY.user_preferences, /자차/);
assert.match(payload.GLOBAL_MEMORY.important_schedules, /19:00/);
assert.deepEqual(payload.GLOBAL_MEMORY.key_projects, [
  "부산 여행 준비",
  "쿠우쿠우 맛집 정리",
]);
assert.match(payload.ACTIVE_TASK.current_task, /대전 월드컵 경기장/);
assert.equal(payload.ACTIVE_TASK.relevant_context, "None");
assert.match(payload.INSTRUCTION, /ACTIVE_TASK/);

const block = formatLayeredSystemPromptBlock(payload);
assert.match(block, /^# \[SYSTEM_PROMPT\]/);
assert.match(block, /"GLOBAL_MEMORY"/);
assert.match(block, /"ACTIVE_TASK"/);

const systemPrompt = buildLayeredMasterOrchestratorSystemPrompt({
  context,
  route,
  message,
  userPreferencesOverride: "자차 이용 선호",
});
assert.match(systemPrompt, /# \[SYSTEM_PROMPT\]/);
assert.match(systemPrompt, /Master Orchestrator/);
assert.match(systemPrompt, /Current Date: 2026-05-29/);
assert.match(systemPrompt, /Personal Operating System|Vitality/i);

assert.equal(
  deriveRelevantContext({
    route,
    linkTitle: "쿠우쿠우 도안점",
  }),
  "None"
);

assert.match(
  deriveCurrentTask({ message, route }),
  /대전 월드컵 경기장/
);

console.log("test-layered-system-prompt: ok");
