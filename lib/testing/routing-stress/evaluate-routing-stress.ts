import {
  analyzeSemanticRouting,
  isCriticalInfoMisroute,
  type RoutingSurface,
} from "@/lib/action-chat/classify-semantic-routing-surface";
import type { AttackTestCase } from "@/lib/testing/routing-stress/attack-test-banks";

export type RoutingStressCheck = {
  id: number;
  label: string;
  ok: boolean;
  detail?: string;
};

export type RoutingStressEvaluation = {
  checks: RoutingStressCheck[];
  score: number;
  pass: boolean;
  criticalFailure: string | null;
};

const CHECK_LABELS = [
  "semantic_intent_match",
  "no_info_misroute",
  "expected_surface_set",
  "context_override",
  "not_keyword_only",
  "forbid_info_respected",
  "multi_intent_handled",
  "domain_consistency",
  "no_generic_clarify_trap",
  "causal_explainable",
] as const;

export function evaluateRoutingStress(input: {
  testCase: AttackTestCase;
  actual: RoutingSurface;
  outputSummary: string;
  semanticReason: string;
}): RoutingStressEvaluation {
  const semantic = analyzeSemanticRouting(input.testCase.input);
  const critical = isCriticalInfoMisroute(input.testCase.input, input.actual);

  const semanticMatch =
    input.testCase.expected.includes(input.actual) ||
    semantic.expected.includes(input.actual);

  const checks: RoutingStressCheck[] = [
    {
      id: 1,
      label: CHECK_LABELS[0],
      ok: semanticMatch,
      detail: semanticMatch
        ? undefined
        : `actual=${input.actual} expected=[${input.testCase.expected.join("|")}] semantic=[${semantic.expected.join("|")}]`,
    },
    {
      id: 2,
      label: CHECK_LABELS[1],
      ok: !critical,
      detail: critical ?? undefined,
    },
    {
      id: 3,
      label: CHECK_LABELS[2],
      ok: input.testCase.expected.includes(input.actual),
      detail: input.testCase.expected.includes(input.actual)
        ? undefined
        : `not_in_attack_expected:${input.actual}`,
    },
    {
      id: 4,
      label: CHECK_LABELS[3],
      ok:
        !input.testCase.forbidInfo ||
        input.actual !== "INFO" ||
        semantic.domain === "tech",
      detail:
        input.testCase.forbidInfo && input.actual === "INFO" && semantic.domain !== "tech"
          ? "info_without_context_override"
          : undefined,
    },
    {
      id: 5,
      label: CHECK_LABELS[4],
      ok: semantic.reason !== "genuine_info" || input.testCase.forbidInfo === false,
      detail: undefined,
    },
    {
      id: 6,
      label: CHECK_LABELS[5],
      ok: !input.testCase.forbidInfo || input.actual !== "INFO",
      detail:
        input.testCase.forbidInfo && input.actual === "INFO"
          ? "forbid_info_violated"
          : undefined,
    },
    {
      id: 7,
      label: CHECK_LABELS[6],
      ok:
        !input.testCase.input.includes("+") ||
        input.actual === "FORK" ||
        input.actual === "STEP" ||
        input.actual === "DECISION",
      detail: undefined,
    },
    {
      id: 8,
      label: CHECK_LABELS[7],
      ok: semantic.domain !== "general" || input.actual !== "INFO",
      detail: undefined,
    },
    {
      id: 9,
      label: CHECK_LABELS[8],
      ok: input.outputSummary !== "무엇을 도와드릴까요?" || input.actual !== "INFO",
      detail:
        input.outputSummary === "무엇을 도와드릴까요?"
          ? "generic_clarify_trap"
          : undefined,
    },
    {
      id: 10,
      label: CHECK_LABELS[9],
      ok: Boolean(input.semanticReason?.trim()),
      detail: !input.semanticReason ? "missing_causal_reason" : undefined,
    },
  ];

  const score = checks.filter((check) => check.ok).length;
  return {
    checks,
    score,
    pass: score >= 10 && !critical,
    criticalFailure: critical,
  };
}

export function formatStressReport(input: {
  testIndex: number;
  groupLabel: string;
  message: string;
  actual: RoutingSurface;
  evaluation: RoutingStressEvaluation;
  outputSummary: string;
  mutatedInput?: string;
  retryScore?: number;
}): string {
  const lines = [
    `TEST_ID: ${input.testIndex}`,
    `ATTACK: ${input.groupLabel}`,
    `INPUT: "${input.message}"`,
    `DECISION: ${input.actual}`,
    `OUTPUT_SUMMARY: "${input.outputSummary.slice(0, 100)}"`,
    `QA_SCORE: ${input.evaluation.score}/10`,
    `STATUS: ${input.evaluation.pass ? "PASS" : "FAIL"}`,
  ];

  if (!input.evaluation.pass) {
    const failures = input.evaluation.checks
      .filter((check) => !check.ok)
      .map((check) => `${check.label}:${check.detail ?? "fail"}`);
    lines.push(`→ FAILURE_REASON: ${failures.join("; ")}`);
    if (input.evaluation.criticalFailure) {
      lines.push(`→ CRITICAL: ${input.evaluation.criticalFailure}`);
    }
    if (input.mutatedInput) {
      lines.push(`→ MUTATED_INPUT: "${input.mutatedInput}"`);
    }
    if (input.retryScore != null) {
      lines.push(`→ RETRY_SCORE: ${input.retryScore}/10`);
    }
  }

  return lines.join("\n");
}
