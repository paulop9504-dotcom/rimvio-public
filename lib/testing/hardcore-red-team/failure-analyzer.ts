import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { classifyAbstractionLevel } from "@/lib/testing/unified-stress/abstraction-layer";
import { expandIntent } from "@/lib/testing/unified-stress/expand-intent";
import {
  inferExpectedRouting,
  validateRouting,
} from "@/lib/testing/unified-stress/routing-validation";
import type { SchedulingConflictAnalysis } from "@/lib/testing/unified-stress/types";
import type {
  HardcoreFailureAnalysis,
  HardcoreFailureMode,
  HardcoreRedTeamCase,
} from "@/lib/testing/hardcore-red-team/types";

const PLAN_SHAPE =
  /(?:1\.|2\.|3\.|단계|일정|스케줄|루틴|전략|최적|재설계|이렇게\s*가)/u;
const MEAL_CARD = /(?:맛집|식당|메뉴|배달|먹)/u;
const TIKI_SHAPE = /(?:A\)|B\)|C\)|👉|어느\s*쪽|기준이)/u;

function inferConfidence(input: string, summary: string): number {
  let score = 0.5;
  const wordCount = input.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 2) score -= 0.25;
  if (/모르|그냥|애매|비슷|아까|대충|적당/u.test(input)) score -= 0.2;
  if (TIKI_SHAPE.test(summary)) score += 0.15;
  if (summary.length > 80 && PLAN_SHAPE.test(summary)) score += 0.1;
  return Math.max(0, Math.min(1, score));
}

function detectOverStructuring(
  testCase: HardcoreRedTeamCase,
  summary: string,
  abstractionLevel: ReturnType<typeof classifyAbstractionLevel>
): boolean {
  if (abstractionLevel.level === "L0" || abstractionLevel.level === "L1") {
    if (PLAN_SHAPE.test(summary) && !TIKI_SHAPE.test(summary)) return true;
    if (MEAL_CARD.test(summary) && testCase.expectQuestion) return true;
  }
  if (testCase.tags.includes("ambiguity") && MEAL_CARD.test(summary)) return true;
  return false;
}

function detectHallucination(
  testCase: HardcoreRedTeamCase,
  summary: string
): boolean {
  if (!testCase.history?.length && /(?:아까|전에|그\s*거|비슷)/u.test(testCase.input)) {
    if (MEAL_CARD.test(summary) || PLAN_SHAPE.test(summary)) return true;
  }
  if (/대충\s*알아서|적당히|느낌대로/u.test(testCase.input)) {
    if (summary.length > 60 && !TIKI_SHAPE.test(summary)) return true;
  }
  return false;
}

function detectSchedulingOverrideFailure(
  testCase: HardcoreRedTeamCase,
  scheduling: SchedulingConflictAnalysis,
  summary: string
): boolean {
  if (!testCase.tags.includes("scheduling_override")) return false;
  if (!scheduling.conflictDetected) return true;
  if (/무시|갈아|재설계|새로\s*짜/u.test(testCase.input)) {
    if (!/충돌|겹|조정|미루|재배치/u.test(summary)) return true;
  }
  return false;
}

export function analyzeHardcoreFailure(input: {
  testCase: HardcoreRedTeamCase;
  result: OrchestratorResult;
  scheduling: SchedulingConflictAnalysis;
}): HardcoreFailureAnalysis {
  const { testCase, result, scheduling } = input;
  const summary = result.summary ?? "";
  const abstraction = classifyAbstractionLevel(testCase.input);
  const routing = validateRouting({
    text: testCase.input,
    result,
    expectedRouting: testCase.expectedRouting,
    abstraction,
  });
  const confidenceScore = inferConfidence(testCase.input, summary);

  let failureMode: HardcoreFailureMode = routing.failureType;
  let systemWeakPoint = "none";
  let notes = "";
  let isFailure = failureMode !== "none";

  if (detectHallucination(testCase, summary)) {
    failureMode = "hallucination";
    systemWeakPoint = "context_hallucination_under_drift";
    notes = "Context-missing input got concrete answer";
    isFailure = true;
  }

  if (detectOverStructuring(testCase, summary, abstraction)) {
    failureMode = "over-structuring";
    systemWeakPoint = "premature_plan_on_low_abstraction";
    notes = "L0/L1 input received plan/meal instead of question";
    isFailure = true;
  }

  if (detectSchedulingOverrideFailure(testCase, scheduling, summary)) {
    failureMode = "scheduling_override";
    systemWeakPoint = "schedule_override_blind_spot";
    notes = "System shock input did not surface schedule conflict";
    isFailure = true;
  }

  if (testCase.expectQuestion && !TIKI_SHAPE.test(summary) && routing.predictedIntent === "FOOD") {
    failureMode = "collapse";
    systemWeakPoint = "boundary_routes_to_food_fork";
    notes = "Ambiguous input collapsed to FOOD";
    isFailure = true;
  }

  if (testCase.expectConflict && !scheduling.conflictDetected) {
    failureMode = "misroute";
    systemWeakPoint = "scheduling_conflict_not_detected";
    notes = "Expected conflict — none detected";
    isFailure = true;
  }

  if (testCase.expectedAbstraction && testCase.expectedAbstraction !== abstraction.level) {
    notes = notes
      ? `${notes}; abstraction ${abstraction.level} vs expected ${testCase.expectedAbstraction}`
      : `abstraction ${abstraction.level} vs expected ${testCase.expectedAbstraction}`;
    if (!isFailure) {
      failureMode = "collapse";
      systemWeakPoint = "abstraction_misclassification";
      isFailure = true;
    }
  }

  const expected = inferExpectedRouting(testCase.input, testCase.expectedRouting);
  if (expected !== routing.predictedIntent && failureMode === "none") {
    failureMode = routing.failureType === "none" ? "overfit" : routing.failureType;
    systemWeakPoint = `routing_${expected}_to_${routing.predictedIntent}`;
    isFailure = true;
  }

  if (failureMode === "none") {
    systemWeakPoint = "survived_red_team";
  }

  return {
    failureMode,
    confidenceScore,
    systemWeakPoint,
    notes,
    isFailure,
  };
}
