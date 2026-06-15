#!/usr/bin/env npx tsx
/**
 * Threadline / DEOS Adaptive QA Test Runner (SELF-VALIDATING)
 *
 * Roles: User Simulator · System Tester · QA Judge · Mutation Engine
 * Pass rule: QA_SCORE ≥ 10/10 only
 */
import { runOrchestratorPipeline } from "../lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { composeDecision, rankCandidates } from "../lib/deos/decision";
import { ocrReviewCandidatesFromTrigger } from "../lib/deos/decision";
import { projectSurfaceToDecisionCard } from "../lib/deos/decision/project-surface-to-threadline";
import { validateSurfaceTransition } from "../lib/deos/decision/validate-state-transition";
import { validateThreadlineKernelGuards } from "../lib/threadline";
import { evaluateAdaptiveQa } from "../lib/testing/deos-adaptive-qa/evaluate-adaptive-qa";
import {
  formatAdaptiveQaReport,
  formatAdaptiveQaSummary,
  type AdaptiveQaReport,
} from "../lib/testing/deos-adaptive-qa/format-adaptive-qa-report";
import { mutateTestInput } from "../lib/testing/deos-adaptive-qa/mutate-test-input";
import { simulateAdaptiveTest } from "../lib/testing/deos-adaptive-qa/project-orchestrator-surface";
import { ADAPTIVE_QA_CASES } from "../lib/testing/deos-adaptive-qa/test-case-banks";
import { isOpenAiConfigured } from "../lib/llm/openai-config";

const MAX_MUTATION_RETRIES = 3;

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

function verifyDeosComposePath(): string[] {
  const violations: string[] = [];
  const trigger = {
    type: "OCR_REVIEW_DATE_PICKER" as const,
    rows: [{ candidateId: "c1", title: "병원", time: "14:00" }],
  };
  const candidates = ocrReviewCandidatesFromTrigger(trigger, "awaiting_date");
  const probability = rankCandidates(candidates);
  const result = composeDecision({
    intent: {
      raw: "맞아",
      kind: "approve_speech",
      scopeId: "default",
      clockIso: new Date().toISOString(),
    },
    state: {
      scopeId: "default",
      cardState: "WAITING",
      activeCardId: "card:ocr-active",
      gatePhase: "awaiting_date",
    },
    candidates,
    probability,
    title: "병원",
  });

  if (result.surface.mode !== "fork") {
    violations.push(`deos_compose_mode:${result.surface.mode}`);
  }
  if (result.surface.mode === "fork" && result.surface.chips.length > 3) {
    violations.push(`deos_fork_overflow:${result.surface.chips.length}`);
  }
  const valid = validateSurfaceTransition(result.surface);
  if (!valid.allowed) {
    violations.push(`deos_surface_invalid:${valid.reason}`);
  }
  const card = projectSurfaceToDecisionCard(result.surface, { cardId: "qa:deos" });
  const guards = validateThreadlineKernelGuards([card]);
  if (guards.length > 0) {
    violations.push(`deos_threadline_guards:${guards.join(",")}`);
  }
  return violations;
}

async function runSingleCase(testId: number, input: string, category: (typeof ADAPTIVE_QA_CASES)[number]["category"]) {
  let currentInput = input;
  let lastSim = null as ReturnType<typeof simulateAdaptiveTest> | null;
  let lastEval = null as ReturnType<typeof evaluateAdaptiveQa> | null;
  let mutatedInput: string | undefined;
  let retryEval: ReturnType<typeof evaluateAdaptiveQa> | undefined;

  for (let attempt = 0; attempt <= MAX_MUTATION_RETRIES; attempt++) {
    const orchestrator = await runOrchestratorPipeline({
      message: currentInput,
      masterContext,
    });
    const sim = simulateAdaptiveTest({
      message: currentInput,
      category,
      orchestrator,
    });
    const evaluation = evaluateAdaptiveQa(sim);

    lastSim = sim;
    lastEval = evaluation;

    if (evaluation.pass) {
      return {
        report: formatAdaptiveQaReport(testId, sim, evaluation, {
          mutatedInput,
          retryEvaluation: retryEval,
        }),
        pass: true,
        sim,
        evaluation,
      };
    }

    if (attempt < MAX_MUTATION_RETRIES) {
      const mutation = mutateTestInput(currentInput, category, attempt);
      mutatedInput = mutation.mutated;
      retryEval = evaluation;
      currentInput = mutation.mutated;
    }
  }

  return {
    report: formatAdaptiveQaReport(testId, lastSim!, lastEval!, {
      mutatedInput,
      retryEvaluation: retryEval,
    }),
    pass: false,
    sim: lastSim!,
    evaluation: lastEval!,
  };
}

async function main() {
  const deosViolations = verifyDeosComposePath();
  if (deosViolations.length > 0) {
    console.error("DEOS_COMPOSE_PREFLIGHT_FAIL");
    for (const violation of deosViolations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }

  console.log(`OpenAI configured: ${isOpenAiConfigured()}`);
  console.log("--- DEOS compose preflight: PASS ---\n");

  const reports: AdaptiveQaReport[] = [];

  for (const testCase of ADAPTIVE_QA_CASES) {
    const outcome = await runSingleCase(
      testCase.id,
      testCase.input,
      testCase.category
    );

    console.log(outcome.report);
    console.log("---");

    reports.push({
      testId: testCase.id,
      input: outcome.sim.input,
      category: outcome.sim.category,
      decision: outcome.sim.projectedKind,
      plugin: outcome.sim.plugins,
      outputSummary: outcome.sim.outputSummary,
      qaScore: outcome.evaluation.score,
      status: outcome.pass ? "PASS" : "FAIL",
    });

    if (!outcome.pass) {
      console.error(`\nSYSTEM ISSUE — STOP at TEST_ID ${testCase.id}`);
      console.error(formatAdaptiveQaSummary(reports));
      process.exit(1);
    }
  }

  console.log(formatAdaptiveQaSummary(reports));
  console.log("test-deos-adaptive-qa-runner: ok");
}

void main();
