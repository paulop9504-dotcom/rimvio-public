#!/usr/bin/env npx tsx
/**
 * HARD MODE — Intent Routing + Decision Engine + Fallback + Context
 *
 * Target: deciding system, not understanding system.
 * Pass: all 6 criteria · no FAIL_1–5 · 10 mutation rounds on failure.
 */
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import {
  HARD_MODE_CASES,
  HARD_MODE_MUTATION_ROUNDS,
  type HardModeCase,
} from "../lib/testing/hard-mode/hard-mode-banks";
import {
  evaluateHardModeCase,
  formatHardModeReport,
} from "../lib/testing/hard-mode/evaluate-hard-mode";
import { mutateHardModeInput } from "../lib/testing/hard-mode/mutate-hard-mode";
import { toHardModeRun } from "../lib/testing/hard-mode/hard-mode-routing";
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

async function runInputs(testCase: HardModeCase, inputs: readonly string[]) {
  const runs = [];
  for (const input of inputs) {
    const repetitions = testCase.determinismRuns ?? 1;
    for (let rep = 0; rep < repetitions; rep++) {
      const result = await runOrchestratorPipeline({
        message: input,
        history: testCase.history ? [...testCase.history] : undefined,
        masterContext,
      });
      runs.push(toHardModeRun(input, result, testCase.history));
    }
  }
  return runs;
}

async function runCase(testCase: HardModeCase) {
  const baseInputs = [...testCase.inputs];

  for (let attempt = 0; attempt <= HARD_MODE_MUTATION_ROUNDS; attempt++) {
    const inputs =
      attempt === 0
        ? baseInputs
        : baseInputs.map((input, index) => mutateHardModeInput(input, attempt + index));

    const runs = await runInputs(testCase, inputs);
    const evaluation = evaluateHardModeCase(testCase, runs);

    if (evaluation.pass) {
      return {
        pass: true,
        report: formatHardModeReport({ testCase, runs, evaluation }),
      };
    }

    if (attempt === HARD_MODE_MUTATION_ROUNDS) {
      return {
        pass: false,
        report: formatHardModeReport({
          testCase,
          runs,
          evaluation,
          mutatedInput: inputs[0],
          attempt,
        }),
      };
    }
  }

  return { pass: false, report: "unreachable" };
}

async function main() {
  console.log(`OpenAI configured: ${isOpenAiConfigured()}`);
  console.log("--- HARD MODE: Intent + Decision + Fallback + Context ---\n");

  let passed = 0;

  for (const testCase of HARD_MODE_CASES) {
    const outcome = await runCase(testCase);
    console.log(outcome.report);
    console.log("---");

    if (!outcome.pass) {
      console.error(`\nHARD MODE STOP — ${testCase.id} (${testCase.criterion})`);
      process.exit(1);
    }
    passed++;
  }

  console.log(`HARD_MODE_SUMMARY: ${passed}/${HARD_MODE_CASES.length} PASS`);
  console.log("test-hard-mode-routing: ok");
}

void main();
