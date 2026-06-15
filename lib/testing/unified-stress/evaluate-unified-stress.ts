import { runOrchestratorPipeline } from "@/lib/action-chat/orchestrator/run-orchestrator-pipeline";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { classifyAbstractionLevel } from "@/lib/testing/unified-stress/abstraction-layer";
import { generateAdversarialTests } from "@/lib/testing/unified-stress/adversarial-tests";
import { expandIntent } from "@/lib/testing/unified-stress/expand-intent";
import {
  mutateUnifiedStressInput,
  UNIFIED_STRESS_MUTATION_ROUNDS,
} from "@/lib/testing/unified-stress/failure-loop";
import { validateRouting } from "@/lib/testing/unified-stress/routing-validation";
import { resolveSchedulingConflict } from "@/lib/testing/unified-stress/scheduling-conflict-resolver";
import { generateSemanticVariations } from "@/lib/testing/unified-stress/semantic-generator";
import type {
  UnifiedStressCase,
  UnifiedStressRun,
} from "@/lib/testing/unified-stress/types";

export type MasterContextFixture = Parameters<
  typeof runOrchestratorPipeline
>[0]["masterContext"];

async function runPipeline(
  testCase: UnifiedStressCase,
  message: string,
  masterContext: MasterContextFixture
): Promise<OrchestratorResult> {
  return runOrchestratorPipeline({
    message,
    history: testCase.history ? [...testCase.history] : undefined,
    masterContext: {
      ...masterContext,
      existingSchedule: testCase.existingSchedule ?? masterContext.existingSchedule,
    },
  });
}

function evaluateCasePass(
  testCase: UnifiedStressCase,
  primaryRow: ReturnType<typeof validateRouting>,
  scheduling: ReturnType<typeof resolveSchedulingConflict>
): boolean {
  if (!primaryRow.pass) return false;

  if (testCase.expectedAbstraction) {
    const abstraction = classifyAbstractionLevel(testCase.input);
    if (abstraction.level !== testCase.expectedAbstraction) {
      return false;
    }
  }

  if (testCase.tags?.includes("conflict") && !scheduling.conflictDetected) {
    return false;
  }

  return true;
}

export async function runUnifiedStressCase(
  testCase: UnifiedStressCase,
  masterContext: MasterContextFixture
): Promise<UnifiedStressRun> {
  const expansion = expandIntent(testCase.input);
  const abstraction = classifyAbstractionLevel(testCase.input);
  const semanticVariations = generateSemanticVariations(testCase.input);
  const adversarialTests = generateAdversarialTests(testCase.input);
  const scheduling = resolveSchedulingConflict({
    expansion,
    existingSchedule: testCase.existingSchedule ?? [],
    proposedSchedule: testCase.proposedSchedule,
  });

  let failureAttempts = 0;
  let primaryResult: OrchestratorResult | null = null;
  let primaryRow: ReturnType<typeof validateRouting> | null = null;
  let pass = false;

  for (let attempt = 0; attempt <= UNIFIED_STRESS_MUTATION_ROUNDS; attempt++) {
    const message =
      attempt === 0
        ? testCase.input
        : mutateUnifiedStressInput(testCase.input, attempt);

    const result = await runPipeline(testCase, message, masterContext);
    const row = validateRouting({
      text: message,
      result,
      expectedRouting: testCase.expectedRouting,
      abstraction,
    });

    failureAttempts = attempt;
    primaryResult = result;
    primaryRow = row;

    if (evaluateCasePass(testCase, row, scheduling)) {
      pass = true;
      break;
    }
  }

  const routingRows: ReturnType<typeof validateRouting>[] = [];

  if (primaryRow) {
    routingRows.push(primaryRow);
  }

  const sampleInputs = [
    ...semanticVariations.slice(1, 4).map((v) => v.text),
    ...adversarialTests.slice(0, 3).map((a) => a.input),
  ];

  for (const text of sampleInputs) {
    const result = await runPipeline(testCase, text, masterContext);
    routingRows.push(
      validateRouting({
        text,
        result,
        abstraction: classifyAbstractionLevel(text),
      })
    );
  }

  return {
    case: testCase,
    expansion,
    abstraction,
    semanticVariations,
    adversarialTests,
    routingRows,
    scheduling,
    failureAttempts,
    pass,
  };
}

export function evaluateUnifiedStressRun(run: UnifiedStressRun): {
  pass: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!run.pass) {
    reasons.push("primary_routing_or_abstraction_fail");
  }
  const primaryRow = run.routingRows.find((r) => r.input === run.case.input);
  const failedVariations = run.routingRows.filter(
    (r) => r.input !== run.case.input && !r.pass
  );
  if (failedVariations.length > 0) {
    reasons.push(`variation_failures=${failedVariations.length}`);
  }
  return {
    pass: run.pass,
    reasons,
    primaryRow,
    variationFailureCount: failedVariations.length,
  };
}
