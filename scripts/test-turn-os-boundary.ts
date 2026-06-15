#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { parseTurnIntent } from "../lib/action-chat/turn/parse-turn-intent";
import { describeClientTurnRoute } from "../lib/action-chat/turn/route-client-turn";
import { historyContentFromMessage } from "../lib/action-chat/turn/message-helpers";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";

assert.deepEqual(
  parseTurnIntent("  hi ", undefined, () => "schedule"),
  {
    trimmed: "@검색 hi",
    pendingAttachments: [],
    chatAxis: "schedule",
    axisOrchestrateOverride: null,
    isEmpty: false,
  },
);

assert.equal(
  describeClientTurnRoute({
    sending: false,
    intent: parseTurnIntent("x", undefined, () => "schedule"),
  }),
  "command_os",
);

assert.equal(
  historyContentFromMessage({
    id: "1",
    role: "assistant",
    text: "ignored",
    confirmation: { persona_message: "confirm text" },
  } as import("../lib/action-chat/orchestrator-types").ActionChatMessage),
  "confirm text",
);

async function main() {
const replan = await runOrchestratorPipeline({
  message: "내 일정 다 무시하고 새로 짜줘",
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
assert.match(replan.summary ?? "", /재조정|리밸런스|RESCHEDULE/u);

console.log("test-turn-os-boundary: ok");
}

void main();
