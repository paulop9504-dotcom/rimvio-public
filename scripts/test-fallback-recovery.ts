#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildOrchestrateFallbackResult } from "../lib/action-chat/build-orchestrate-fallback";
import { buildFallbackRecoveryReply } from "../lib/action-chat/fallback-recovery/build-fallback-recovery-reply";
import {
  inferFallbackRecovery,
  isForbiddenFallbackText,
} from "../lib/action-chat/fallback-recovery/infer-fallback-recovery";
import { applyFallbackRecovery } from "../lib/action-chat/fallback-recovery/apply-fallback-recovery";
import { RIMVIO_CONVERSATION_LINES } from "../lib/action-chat/rimvio-persona";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { BUSY_SCHEDULE_FIXTURE } from "../lib/testing/hardcore-red-team/adversarial-sets";

assert.ok(isForbiddenFallbackText("잠시 문제가 있어요"));
assert.ok(isForbiddenFallbackText("다시 말씀해 주세요"));
assert.ok(isForbiddenFallbackText(""));
assert.ok(isForbiddenFallbackText(RIMVIO_CONVERSATION_LINES.fallback));

const doctor = buildFallbackRecoveryReply("의사가 되고싶어");
assert.match(doctor, /의사/u);
assert.match(doctor, /진로/u);
assert.doesNotMatch(doctor, /잠시 문제|다시 말씀|처리할 수 없|맥락을 잘못 짚/i);

const hairdresser = buildFallbackRecoveryReply("미용사가 될꺼야");
assert.match(hairdresser, /미용사/u);
assert.match(hairdresser, /진로|커리어/u);

const hairdresser2 = inferFallbackRecovery("미용사가 되고싶어");
assert.equal(hairdresser2.primary, "career_planning");
assert.equal(hairdresser2.roleHint, "미용사");

const inference = inferFallbackRecovery("의사가 되고싶어");
assert.equal(inference.primary, "career_planning");
assert.ok(inference.candidates.includes("career_planning"));

const recovered = applyFallbackRecovery(
  {
    summary: RIMVIO_CONVERSATION_LINES.fallback,
    actions: [],
    source: "rules",
    confidence: 0.2,
    disclosure: "low",
    actionsRevealed: false,
    pendingConfirm: false,
  },
  "의사가 되고싶어"
);
assert.equal(recovered.metadata?.fallback_recovery, true);
assert.doesNotMatch(recovered.summary ?? "", /잠시 문제/i);

const apiFallback = buildOrchestrateFallbackResult({ message: "의사가 되고싶어" });
assert.doesNotMatch(apiFallback.summary ?? "", /잠시 문제/i);
assert.match(apiFallback.summary ?? "", /의사|진로/u);

const mc = {
  currentDate: "2026-06-06T12:00:00",
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

async function main() {
  const pipeline = await runOrchestratorPipeline({
    message: "의사가 되고싶어",
    masterContext: mc,
  });
  assert.doesNotMatch(pipeline.summary ?? "", /잠시 문제|다시 말씀해|처리할 수 없|맥락을 잘못 짚/i);
  assert.match(pipeline.summary ?? "", /의사|진로/u);
  assert.equal(pipeline.metadata?.routing_patch, "FALLBACK_RECOVERY");

  const repeat = await runOrchestratorPipeline({
    message: "미용사가 되고싶어",
    masterContext: mc,
    history: [
      { role: "user", content: "미용사가 될꺼야" },
      { role: "assistant", content: "제가 맥락을 잘못 짚은 것 같아요." },
    ],
  });
  assert.match(repeat.summary ?? "", /미용사|진로|커리어/u);
  assert.doesNotMatch(repeat.summary ?? "", /맥락을 잘못 짚/i);

  console.log("test-fallback-recovery: ok");
}

void main();
