#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { detectFrustrationEscape } from "../lib/action-chat/adaptive-behavior/ux-guards/frustration-circuit-breaker";
import {
  orchestrateSlotCollectContinuation,
  isSlotCollectReply,
} from "../lib/event-commit-gate/resolve-slot-collect-reply";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { orchestrateStudyContext } from "../lib/contextual-aux/study/orchestrate-study-context";

const history = [
  { role: "user" as const, content: "배고파" },
  {
    role: "assistant" as const,
    content: "어떤 기준으로 볼까요? **지역·메뉴·분위기** 중 하나만 말해 주세요.",
  },
];

assert.equal(isSlotCollectReply("지역", history), true);
assert.equal(detectFrustrationEscape("지역", history), false);

async function main() {
  const region = await orchestrateSlotCollectContinuation({
    message: "지역",
    history,
  });
  assert.ok(region);
  assert.match(region!.summary, /동네|지역/);
  const pipeline = await runOrchestratorPipeline({
    message: "지역",
    history,
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
  assert.notEqual(pipeline.metadata?.semantic_reason, "frustration_circuit_breaker");
  assert.match(pipeline.summary ?? "", /지역|동네|골라/);

  const study = orchestrateStudyContext("나 지금부터 공부할거야");
  assert.ok(study);
  assert.equal(study!.metadata?.auto_execute_study_aux, "focus_timer");

  const timerLabel = orchestrateStudyContext("집중 모드 및 타이머 시작");
  assert.ok(timerLabel);
  assert.equal(timerLabel!.metadata?.auto_execute_study_aux, "focus_timer");

  const locationHistory = [
    { role: "user" as const, content: "배고파" },
    {
      role: "assistant" as const,
      content:
        "어떤 기준으로 볼까요? **지역·메뉴·분위기** 중 하나만 말해 주세요.",
    },
    {
      role: "assistant" as const,
      content:
        "**지역** 기준이시네요. **어느 동네** 쪽으로 볼까요? 동·역·구 이름만 말해 주세요.",
    },
  ];

  assert.equal(isSlotCollectReply("대치동", locationHistory), true);
  const daechi = await orchestrateSlotCollectContinuation({
    message: "강남구 대치동",
    history: locationHistory,
  });
  assert.ok(daechi);
  assert.match(daechi!.summary ?? "", /대치동/);
  assert.ok(!/어느 기준이 더 중요/u.test(daechi!.summary ?? ""));

  console.log("test-slot-collect-and-study-timer: ok");
}

void main();
