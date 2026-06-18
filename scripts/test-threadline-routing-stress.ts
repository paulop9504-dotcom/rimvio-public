#!/usr/bin/env npx tsx
/**
 * Threadline Routing Stress Test — FAIL-FOCUS (INFO misclassification hunter)
 *
 * Philosophy: INFO is the most dangerous default.
 * Pass rule: 10/10 per attack + zero critical INFO misroutes.
 */
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { analyzeSemanticRouting } from "../lib/action-chat/classify-semantic-routing-surface";
import { ROUTING_STRESS_ATTACKS } from "../lib/testing/routing-stress/attack-test-banks";
import {
  evaluateRoutingStress,
  formatStressReport,
} from "../lib/testing/routing-stress/evaluate-routing-stress";
import { mutateRoutingStressInput } from "../lib/testing/routing-stress/mutate-routing-stress";
import { resolveHonestRoutingSurface } from "../lib/testing/routing-stress/resolve-honest-routing-surface";
import { isOpenAiConfigured } from "../lib/llm/openai-config";

const MAX_MUTATION_RETRIES = 5;

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

async function runAttack(testIndex: number, input: string) {
  const testCase = ROUTING_STRESS_ATTACKS[testIndex]!;
  let currentInput = input;
  let lastEvaluation = null as ReturnType<typeof evaluateRoutingStress> | null;
  let lastActual = "INFO" as ReturnType<typeof resolveHonestRoutingSurface>;
  let lastSummary = "";
  let mutatedInput: string | undefined;
  let retryScore: number | undefined;

  for (let attempt = 0; attempt <= MAX_MUTATION_RETRIES; attempt++) {
    const orchestrator = await runOrchestratorPipeline({
      message: currentInput,
      masterContext,
    });
    const actual = resolveHonestRoutingSurface(currentInput, orchestrator);
    const semantic = analyzeSemanticRouting(currentInput);
    const evaluation = evaluateRoutingStress({
      testCase: { ...testCase, input: currentInput },
      actual,
      outputSummary: orchestrator.summary ?? "",
      semanticReason: semantic.reason,
    });

    lastEvaluation = evaluation;
    lastActual = actual;
    lastSummary = orchestrator.summary ?? "";

    if (evaluation.pass) {
      return {
        pass: true,
        report: formatStressReport({
          testIndex: testIndex + 1,
          groupLabel: testCase.groupLabel,
          message: currentInput,
          actual,
          evaluation,
          outputSummary: lastSummary,
          mutatedInput,
          retryScore,
        }),
      };
    }

    if (attempt < MAX_MUTATION_RETRIES) {
      retryScore = evaluation.score;
      const mutation = mutateRoutingStressInput(
        currentInput,
        testCase.groupId,
        attempt
      );
      mutatedInput = mutation.mutated;
      currentInput = mutation.mutated;
    }
  }

  return {
    pass: false,
    report: formatStressReport({
      testIndex: testIndex + 1,
      groupLabel: testCase.groupLabel,
      message: currentInput,
      actual: lastActual,
      evaluation: lastEvaluation!,
      outputSummary: lastSummary,
      mutatedInput,
      retryScore,
    }),
  };
}

async function main() {
  console.log(`OpenAI configured: ${isOpenAiConfigured()}`);
  console.log("--- Threadline Routing Stress Test (INFO hunter) ---\n");

  let passed = 0;

  for (let index = 0; index < ROUTING_STRESS_ATTACKS.length; index++) {
    const testCase = ROUTING_STRESS_ATTACKS[index]!;
    const outcome = await runAttack(index, testCase.input);

    console.log(outcome.report);
    console.log("---");

    if (!outcome.pass) {
      console.error(`\nSTOP — INFO misroute or routing failure at TEST_ID ${index + 1}`);
      console.error(`ATTACK: ${testCase.groupLabel}`);
      process.exit(1);
    }
    passed++;
  }

  console.log(`ROUTING_STRESS_SUMMARY: ${passed}/${ROUTING_STRESS_ATTACKS.length} PASS`);
  console.log("test-threadline-routing-stress: ok");
}

void main();
