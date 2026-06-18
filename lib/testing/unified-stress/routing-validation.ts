import { analyzeSemanticRouting } from "@/lib/action-chat/classify-semantic-routing-surface";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  resolveHardModeBucket,
  type HardModeBucket,
} from "@/lib/testing/hard-mode/hard-mode-routing";
import { resolveHonestRoutingSurface } from "@/lib/testing/routing-stress/resolve-honest-routing-surface";
import type {
  AbstractionAnalysis,
  FailureType,
  RoutingType,
  RoutingValidationRow,
} from "@/lib/testing/unified-stress/types";

const GENERIC_FALLBACK = /무엇을\s*도와|잠시\s*문제|다시\s*말씀/u;

export function bucketToRoutingType(bucket: HardModeBucket): RoutingType {
  switch (bucket) {
    case "FOOD":
    case "FORK":
      return "FOOD";
    case "SCHEDULE":
    case "STEP":
      return "CALENDAR";
    case "DECISION":
      return "DECISION";
    case "REFLECT":
      return "SOCIAL";
    default:
      return "UNKNOWN";
  }
}

export function inferExpectedRouting(
  message: string,
  expected?: RoutingType
): RoutingType {
  if (expected) return expected;
  const semantic = analyzeSemanticRouting(message);
  if (semantic.domain === "food") return "FOOD";
  if (semantic.domain === "schedule" || semantic.domain === "travel") return "CALENDAR";
  if (semantic.domain === "emotion") return "SOCIAL";
  if (semantic.forbidInfo) return "DECISION";
  return "UNKNOWN";
}

function classifyFailureType(input: {
  expected: RoutingType;
  predicted: RoutingType;
  summary: string;
  abstraction: AbstractionAnalysis;
}): FailureType {
  if (input.expected === input.predicted) return "none";
  if (input.predicted === "UNKNOWN" && GENERIC_FALLBACK.test(input.summary)) {
    return "fallback";
  }
  if (
    input.abstraction.mustAskQuestion &&
    input.predicted !== "DECISION" &&
    input.predicted !== "SOCIAL"
  ) {
    return "collapse";
  }
  if (input.expected !== "UNKNOWN" && input.predicted === "UNKNOWN") {
    return "misroute";
  }
  return "overfit";
}

export function validateRouting(input: {
  text: string;
  result: OrchestratorResult;
  expectedRouting?: RoutingType;
  abstraction: AbstractionAnalysis;
}): RoutingValidationRow {
  const surface = resolveHonestRoutingSurface(input.text, input.result);
  const bucket = resolveHardModeBucket(input.text, surface);
  const predicted = bucketToRoutingType(bucket);
  const expected = inferExpectedRouting(input.text, input.expectedRouting);
  const summary = input.result.summary ?? "";
  const failureType = classifyFailureType({
    expected,
    predicted,
    summary,
    abstraction: input.abstraction,
  });

  const pass =
    failureType === "none" ||
    (input.abstraction.mustAskQuestion &&
      (predicted === "DECISION" || predicted === "SOCIAL"));

  return {
    input: input.text,
    expectedIntent: expected,
    predictedIntent: predicted,
    routingType: predicted,
    failureType,
    pass,
  };
}
