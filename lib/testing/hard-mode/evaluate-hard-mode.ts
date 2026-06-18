import type { HardModeCase } from "@/lib/testing/hard-mode/hard-mode-banks";
import {
  isInfoFallbackAbuse,
  isRandomChatOnly,
  type HardModeBucket,
  type HardModeRun,
} from "@/lib/testing/hard-mode/hard-mode-routing";

export type HardModeCheck = {
  rule: string;
  ok: boolean;
  detail?: string;
};

export type HardModeEvaluation = {
  checks: HardModeCheck[];
  score: number;
  pass: boolean;
  failCodes: string[];
};

function push(checks: HardModeCheck[], rule: string, ok: boolean, detail?: string) {
  checks.push({ rule, ok, detail });
}

export function evaluateHardModeCase(
  testCase: HardModeCase,
  runs: HardModeRun[]
): HardModeEvaluation {
  const checks: HardModeCheck[] = [];
  const failCodes: string[] = [];

  if (testCase.expectSameBucket && runs.length >= 2) {
    const buckets = new Set(runs.map((run) => run.bucket));
    const ok = buckets.size === 1;
    push(
      checks,
      "intent_consistency",
      ok,
      ok ? undefined : `buckets=${[...buckets].join("|")}`
    );
    if (!ok) failCodes.push("FAIL_5");
  }

  for (const run of runs) {
    if (testCase.expectedBuckets?.length) {
      const ok = testCase.expectedBuckets.includes(run.bucket);
      push(
        checks,
        "expected_bucket",
        ok,
        ok ? undefined : `${run.input}→${run.bucket} want=[${testCase.expectedBuckets.join("|")}]`
      );
      if (!ok) failCodes.push("FAIL_2");
    }
    if (testCase.forbiddenSurfaces?.includes(run.surface)) {
      push(checks, "forbidden_surface", false, `${run.input}→${run.surface}`);
      failCodes.push("FAIL_1");
    } else {
      push(checks, "forbidden_surface", true);
    }

    if (testCase.forbiddenBuckets?.includes(run.bucket)) {
      push(checks, "forbidden_bucket", false, `${run.input}→${run.bucket}`);
      failCodes.push("FAIL_1");
    } else {
      push(checks, "forbidden_bucket", true);
    }

    if (isInfoFallbackAbuse(run)) {
      push(checks, "no_info_fallback", false, run.input);
      failCodes.push("FAIL_1");
    } else {
      push(checks, "no_info_fallback", true);
    }

    if (isRandomChatOnly(run)) {
      push(checks, "no_chat_only", false, run.input);
      failCodes.push("FAIL_1");
    } else {
      push(checks, "no_chat_only", true);
    }

    if (testCase.expectPrimary && run.primaryIntent !== testCase.expectPrimary) {
      push(
        checks,
        "multi_intent_primary",
        false,
        `expected=${testCase.expectPrimary} got=${run.primaryIntent}`
      );
      failCodes.push("FAIL_3");
    } else if (testCase.expectPrimary) {
      push(checks, "multi_intent_primary", true);
    }

    if (run.surface === "INFO" && testCase.criterion !== "determinism") {
      const boundaryOk = !testCase.forbiddenSurfaces?.includes("INFO");
      if (!boundaryOk) {
        push(checks, "boundary_no_info", false, run.input);
        failCodes.push("FAIL_2");
      }
    }
  }

  if (testCase.criterion === "determinism" && runs.length >= 2) {
    const surfaces = runs.map((run) => run.surface);
    const summaries = runs.map((run) => run.summary);
    const surfaceOk = surfaces.every((surface) => surface === surfaces[0]);
    const summaryOk = summaries.every((summary) => summary === summaries[0]);
    push(
      checks,
      "determinism",
      surfaceOk && summaryOk,
      surfaceOk && summaryOk ? undefined : `surfaces=${surfaces.join(",")}`
    );
    if (!surfaceOk || !summaryOk) failCodes.push("FAIL_5");
  }

  if (testCase.criterion === "context_continuity") {
    const reset = runs.some(
      (run) => run.summary === "무엇을 도와드릴까요?" || run.surface === "INFO"
    );
    push(checks, "context_no_reset", !reset, reset ? "context_reset" : undefined);
    if (reset) failCodes.push("FAIL_4");
  }

  const uniqueChecks = dedupeChecks(checks);
  const score = uniqueChecks.filter((check) => check.ok).length;
  const pass = uniqueChecks.every((check) => check.ok);

  return {
    checks: uniqueChecks,
    score,
    pass,
    failCodes: [...new Set(failCodes)],
  };
}

function dedupeChecks(checks: HardModeCheck[]): HardModeCheck[] {
  const map = new Map<string, HardModeCheck>();
  for (const check of checks) {
    const prev = map.get(check.rule);
    if (!prev || !check.ok) {
      map.set(check.rule, { ...check, ok: prev ? prev.ok && check.ok : check.ok });
    }
  }
  return [...map.values()];
}

export function formatHardModeReport(input: {
  testCase: HardModeCase;
  runs: HardModeRun[];
  evaluation: HardModeEvaluation;
  mutatedInput?: string;
  attempt?: number;
}): string {
  const lines = [
    `TEST_ID: ${input.testCase.id}`,
    `CRITERION: ${input.testCase.criterion}`,
    `LABEL: ${input.testCase.label}`,
    `INPUTS: ${input.runs.map((run) => `"${run.input}"`).join(", ")}`,
    `BUCKETS: ${input.runs.map((run) => run.bucket).join(" | ")}`,
    `SURFACES: ${input.runs.map((run) => run.surface).join(" | ")}`,
    `QA_SCORE: ${input.evaluation.score}/${input.evaluation.checks.length}`,
    `STATUS: ${input.evaluation.pass ? "PASS" : "FAIL"}`,
  ];
  if (!input.evaluation.pass) {
    lines.push(
      `→ FAIL_CODES: ${input.evaluation.failCodes.join(", ") || "none"}`
    );
    lines.push(
      `→ DETAIL: ${input.evaluation.checks
        .filter((check) => !check.ok)
        .map((check) => `${check.rule}:${check.detail ?? "fail"}`)
        .join("; ")}`
    );
    if (input.mutatedInput) {
      lines.push(`→ MUTATED_INPUT: "${input.mutatedInput}" (attempt ${input.attempt})`);
    }
  }
  return lines.join("\n");
}
