#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { resolveAdaptiveBehaviorContext } from "../lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import { resolvePersonaToneMode } from "../lib/action-chat/adaptive-persona/resolve-persona-mode";
import {
  applyAdaptivePersona,
  sanitizePersonaSurface,
  transformSummaryWithPersona,
} from "../lib/action-chat/adaptive-persona/apply-adaptive-persona";
import { buildAdaptivePersonaPromptBlock } from "../lib/action-chat/adaptive-persona/build-adaptive-persona-prompt";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { BUSY_SCHEDULE_FIXTURE } from "../lib/testing/hardcore-red-team/adversarial-sets";

const mc = {
  currentDate: "2026-06-06T15:00:00",
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

const vitalityAdaptive = resolveAdaptiveBehaviorContext({ message: "너무 힘들어" });
assert.equal(
  resolvePersonaToneMode({ adaptive: vitalityAdaptive }),
  "vitality"
);

const exploreAdaptive = resolveAdaptiveBehaviorContext({ message: "뭐 먹지" });
assert.equal(
  resolvePersonaToneMode({ adaptive: exploreAdaptive }),
  "tiki_taka"
);

const executionAdaptive = resolveAdaptiveBehaviorContext({
  message: "내일 오후 3시 강남역 미팅 잡아줘",
});
assert.equal(
  resolvePersonaToneMode({
    adaptive: executionAdaptive,
    resultHint: { source: "rules", intent: "SCHEDULE", pendingConfirm: true },
  }),
  "execution"
);

assert.doesNotMatch(
  sanitizePersonaSurface("routing_patch L2 vitality_states 테스트"),
  /routing|L2|vitality/i
);
assert.doesNotMatch(
  transformSummaryWithPersona("AI로서 말씀드리면 도움이 되었나요?", "vitality"),
  /AI로서|도움이 되었/i
);

const vitalityText = transformSummaryWithPersona(
  "A) 일\nB) 사람\nC) 전반\n\n👉 어느 쪽이 더 가까워요?",
  "vitality"
);
assert.ok(!/^C\)/m.test(vitalityText));

assert.match(buildAdaptivePersonaPromptBlock({ mode: "execution", stage: "execution" }), /EXECUTION/i);
assert.match(buildAdaptivePersonaPromptBlock(), /Adaptive Persona/i);

async function main() {
  const counseling = await runOrchestratorPipeline({
    message: "요즘 너무 우울해",
    masterContext: mc,
  });
  assert.equal(
    (counseling.metadata as { persona_tone?: string })?.persona_tone,
    "vitality"
  );
  assert.doesNotMatch(counseling.summary ?? "", /L0|routing|vitality_states/i);

  const applied = applyAdaptivePersona(
    {
      summary: "좋습니다. 내일 오후 3시 일정으로 확정하겠습니다.",
      actions: [{ id: "a", label: "확인", kind: "custom", payload: {} }],
      source: "rules",
      confidence: 0.9,
      disclosure: "none",
      actionsRevealed: true,
      pendingConfirm: true,
      presentation: { mode: "conversation" },
      metadata: { intent: "SCHEDULE" },
    },
    executionAdaptive
  );
  assert.equal(
    (applied.metadata as { persona_tone?: string })?.persona_tone,
    "execution"
  );

  console.log("test-adaptive-persona: ok");
}

void main();
