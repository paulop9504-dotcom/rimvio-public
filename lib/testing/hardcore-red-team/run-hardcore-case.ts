import { runOrchestratorPipeline } from "@/lib/action-chat/orchestrator/run-orchestrator-pipeline";
import { classifyAbstractionLevel } from "@/lib/testing/unified-stress/abstraction-layer";
import { expandIntent } from "@/lib/testing/unified-stress/expand-intent";
import { resolveSchedulingConflict } from "@/lib/testing/unified-stress/scheduling-conflict-resolver";
import {
  inferExpectedRouting,
  validateRouting,
} from "@/lib/testing/unified-stress/routing-validation";
import { computeCostMetrics } from "@/lib/testing/hardcore-red-team/cost-tracker";
import { analyzeHardcoreFailure } from "@/lib/testing/hardcore-red-team/failure-analyzer";
import type {
  HardcoreExecutionEntry,
  HardcoreRedTeamCase,
} from "@/lib/testing/hardcore-red-team/types";
import type { MasterContextFixture } from "@/lib/testing/unified-stress/evaluate-unified-stress";

function promptComplexityScore(input: string, historyLen: number): number {
  let score = 1;
  const layers = [/모르|그냥|답답/u, /추천|어떡|뭐\s*하/u, /맛집|운동|일정|돈/u, /목표|제약|예산/u, /루틴|전략|최적/u];
  for (const p of layers) {
    if (p.test(input)) score += 1;
  }
  if (/\+|그리고|인데|근데/u.test(input)) score += 1;
  if (historyLen > 0) score += 1;
  return Math.min(10, score);
}

export async function runHardcoreRedTeamCase(
  testCase: HardcoreRedTeamCase,
  masterContext: MasterContextFixture
): Promise<HardcoreExecutionEntry> {
  const timestamp = new Date().toISOString();
  const expansion = expandIntent(testCase.input);
  const predictedAbstraction = classifyAbstractionLevel(testCase.input);
  const expectedAbstraction =
    testCase.expectedAbstraction ?? predictedAbstraction.level;

  const schedulingStart = performance.now();
  const scheduling = resolveSchedulingConflict({
    expansion,
    existingSchedule: testCase.existingSchedule ?? [],
    proposedSchedule: testCase.proposedSchedule,
  });
  const schedulingCheckTimeMs = performance.now() - schedulingStart;

  const routingStart = performance.now();
  const result = await runOrchestratorPipeline({
    message: testCase.input,
    history: testCase.history ? [...testCase.history] : undefined,
    masterContext: {
      ...masterContext,
      existingSchedule: testCase.existingSchedule ?? masterContext.existingSchedule,
    },
  });
  const routingTimeMs = performance.now() - routingStart;
  const responseTimeMs = routingTimeMs + schedulingCheckTimeMs;

  const routing = validateRouting({
    text: testCase.input,
    result,
    expectedRouting: testCase.expectedRouting,
    abstraction: predictedAbstraction,
  });

  const failure = analyzeHardcoreFailure({ testCase, result, scheduling });
  const outputText = result.summary ?? "";
  const historyLen = testCase.history?.length ?? 0;

  const cost = computeCostMetrics({
    inputText: testCase.input + (testCase.history?.map((h) => h.content).join(" ") ?? ""),
    outputText,
    intentCount: expansion.expandedIntents.length,
    routingDecisionCount: 1,
    recursionDepth: 0,
  });

  const conflictType =
    scheduling.conflictKinds[0] ??
    (scheduling.conflictDetected ? "SOFT" : "none");

  const conflictResolutionType =
    scheduling.resolutions[0]?.strategy ?? "none";

  return {
    testId: testCase.id,
    input: testCase.input,
    testSet: testCase.testSet,
    timestamp,
    intentCore: expansion.intentCore,
    expandedIntents: expansion.expandedIntents,
    abstractionLevel: predictedAbstraction.level,
    expectedAbstractionLevel: expectedAbstraction,
    predictedAbstractionLevel: predictedAbstraction.level,
    abstractionError: expectedAbstraction !== predictedAbstraction.level,
    routingDecision: routing.predictedIntent,
    expectedRouting: inferExpectedRouting(testCase.input, testCase.expectedRouting),
    schedulingConflict: scheduling.conflictDetected,
    conflictType: conflictType as HardcoreExecutionEntry["conflictType"],
    conflictResolutionType: conflictResolutionType as HardcoreExecutionEntry["conflictResolutionType"],
    failure,
    cost,
    latency: {
      responseTimeMs,
      routingTimeMs,
      schedulingCheckTimeMs,
    },
    load: {
      contextLength: testCase.input.length + historyLen * 40,
      promptComplexityScore: promptComplexityScore(testCase.input, historyLen),
      recursionDepth: 0,
      retryCount: 0,
    },
  };
}
