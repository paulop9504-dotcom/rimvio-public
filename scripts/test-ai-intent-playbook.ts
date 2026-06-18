#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  classifyAiIntentUtterance,
  isAiIntentUtterance,
} from "../lib/action-chat/classify-ai-intent-utterance";
import { orchestrateAiIntent } from "../lib/action-chat/orchestrate-ai-intent";
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import {
  AI_INTENT_CATEGORIES,
  AI_INTENT_PLAYBOOK,
} from "../lib/testing/ai-intent-playbook-banks";
import {
  evaluateAiIntentCategory,
  formatAiIntentFailure,
} from "../lib/testing/evaluate-ai-intent-category";
import { GENERIC_CLARIFY } from "../lib/testing/evaluate-playbook-category";
import { isOpenAiConfigured } from "../lib/llm/openai-config";

const masterContext = {
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

function testClassifier() {
  assert.equal(classifyAiIntentUtterance("이거 뭐야?"), "INFO");
  assert.equal(classifyAiIntentUtterance("어떻게 해?"), "HOW_TO");
  assert.equal(classifyAiIntentUtterance("A vs B 뭐가 좋아?"), "DECISION");
  assert.equal(classifyAiIntentUtterance("이메일 써줘"), "CREATION");
  assert.equal(classifyAiIntentUtterance("스트레스 어떻게 해?"), "COUNSELING");
  assert.equal(classifyAiIntentUtterance("너는 어떻게 작동해?"), "CURIOSITY");
  assert.equal(classifyAiIntentUtterance("둔산동 맛집"), null);
  assert.equal(isAiIntentUtterance("쉽게 설명해줘"), true);
}

async function testPipeline() {
  const failures: string[] = [];
  let total = 0;

  for (const category of AI_INTENT_CATEGORIES) {
    for (const message of AI_INTENT_PLAYBOOK[category]) {
      total++;
      const stub = orchestrateAiIntent(message);
      assert.ok(stub, `stub missing: ${message}`);
      assert.notEqual(stub!.summary, GENERIC_CLARIFY, `stub generic: ${message}`);

      const result = await runOrchestratorPipeline({ message, masterContext });
      const check = evaluateAiIntentCategory(category, message, result);
      if (!check.ok) {
        failures.push(formatAiIntentFailure(check));
      }
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ status: "FAIL", total, failures }, null, 2));
    process.exit(1);
  }

  console.log("test-ai-intent-playbook: ok", {
    categories: AI_INTENT_CATEGORIES.length,
    utterances: total,
    openAi: isOpenAiConfigured(),
  });
}

async function main() {
  testClassifier();
  await testPipeline();
}

void main();
