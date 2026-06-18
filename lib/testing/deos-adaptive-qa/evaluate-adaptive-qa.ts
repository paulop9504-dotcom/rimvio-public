import type { AdaptiveSimulation } from "@/lib/testing/deos-adaptive-qa/project-orchestrator-surface";
import {
  EXPECTED_PLUGINS,
  EXPECTED_SURFACES,
} from "@/lib/testing/deos-adaptive-qa/project-orchestrator-surface";

export type QaCheckId =
  | "intent_match"
  | "surface_validity"
  | "fork_constraint"
  | "plugin_correctness"
  | "state_consistency"
  | "action_executability"
  | "ui_minimality"
  | "output_input_alignment"
  | "data_integrity"
  | "causal_trace";

export type QaCheckResult = {
  id: QaCheckId;
  ok: boolean;
  detail?: string;
};

export type AdaptiveQaEvaluation = {
  checks: QaCheckResult[];
  score: number;
  pass: boolean;
};

const GENERIC_CLARIFY = "무엇을 도와드릴까요?";
const DEBUG_TERMS = /(?:ghost|split|debug\s*graph|kernel_memory|orchestratorTrace)/i;

function checkIntentMatch(sim: AdaptiveSimulation): QaCheckResult {
  const expected = EXPECTED_SURFACES[sim.category];
  const ok = expected.includes(sim.projectedKind);
  return {
    id: "intent_match",
    ok,
    detail: ok
      ? undefined
      : `projected=${sim.projectedKind} expected one of ${expected.join("|")}`,
  };
}

function checkSurfaceValidity(sim: AdaptiveSimulation): QaCheckResult {
  const validKinds = [
    "INFO",
    "STEP",
    "FORK",
    "DECISION",
    "REFLECT",
    "ARTIFACT",
    "AUTO",
    "BLOCKED",
  ] as const;
  const ok =
    validKinds.includes(sim.projectedKind) && sim.projectedKind !== "BLOCKED";
  return {
    id: "surface_validity",
    ok,
    detail: ok ? undefined : `invalid_or_blocked:${sim.projectedKind}`,
  };
}

function checkForkConstraint(sim: AdaptiveSimulation): QaCheckResult {
  if (sim.projectedKind !== "FORK") {
    return { id: "fork_constraint", ok: true };
  }
  const ok = sim.forkCount > 0 && sim.forkCount <= 3;
  return {
    id: "fork_constraint",
    ok,
    detail: ok ? undefined : `fork_count=${sim.forkCount}`,
  };
}

function checkPluginCorrectness(sim: AdaptiveSimulation): QaCheckResult {
  const expected = EXPECTED_PLUGINS[sim.category];
  const ok = expected.some((plugin) => sim.plugins.includes(plugin));
  return {
    id: "plugin_correctness",
    ok,
    detail: ok
      ? undefined
      : `plugins=[${sim.plugins.join(",")}] need one of [${expected.join(",")}]`,
  };
}

function checkStateConsistency(sim: AdaptiveSimulation): QaCheckResult {
  const state = sim.cardState;
  if (state === "N/A") {
    return { id: "state_consistency", ok: true };
  }
  const ok = ["WAITING", "WORKING", "DONE", "DEFERRED"].includes(state);
  const badCombo =
    sim.projectedKind === "FORK" &&
    state === "DONE" &&
    sim.forkCount > 0;
  return {
    id: "state_consistency",
    ok: ok && !badCombo,
    detail: badCombo ? "fork_surface_with_done_state" : ok ? undefined : `state=${state}`,
  };
}

function checkActionExecutability(sim: AdaptiveSimulation): QaCheckResult {
  const actions = sim.orchestrator.actions ?? [];
  if (actions.length === 0) {
    const conversationalOk =
      sim.projectedKind === "INFO" ||
      sim.projectedKind === "STEP" ||
      sim.projectedKind === "DECISION" ||
      sim.projectedKind === "REFLECT" ||
      sim.projectedKind === "ARTIFACT" ||
      sim.forkCount > 0;
    return {
      id: "action_executability",
      ok: conversationalOk,
      detail: conversationalOk ? undefined : "no_executable_actions_or_surface",
    };
  }
  const ok = actions.every(
    (action) =>
      Boolean(action.label?.trim()) &&
      (Boolean(action.href) ||
        Boolean(action.payload) ||
        action.kind === "search" ||
        Boolean(action.id))
  );
  return {
    id: "action_executability",
    ok,
    detail: ok ? undefined : "malformed_action_payload",
  };
}

function checkUiMinimality(sim: AdaptiveSimulation): QaCheckResult {
  const summary = sim.outputSummary;
  const hasDebug = DEBUG_TERMS.test(summary);
  const genericOnly =
    summary === GENERIC_CLARIFY &&
    sim.forkCount === 0 &&
    !sim.orchestrator.actions?.length;

  const forkOk =
    sim.projectedKind !== "FORK" ||
    (sim.forkCount > 0 && sim.forkCount <= 5);

  const ok = !hasDebug && !genericOnly && forkOk;
  return {
    id: "ui_minimality",
    ok,
    detail: !ok
      ? hasDebug
        ? "debug_terms_in_output"
        : genericOnly
          ? "generic_clarify_only"
          : "fork_surface_invalid"
      : undefined,
  };
}

function keywordTokens(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function checkOutputInputAlignment(sim: AdaptiveSimulation): QaCheckResult {
  const inputTokens = keywordTokens(sim.input);
  const outputHay = `${sim.outputSummary} ${sim.because}`.toLowerCase();
  const hit = inputTokens.some((token) =>
    outputHay.includes(token.toLowerCase())
  );
  const conversationalOk =
    sim.projectedKind === "INFO" ||
    sim.projectedKind === "STEP" ||
    sim.projectedKind === "DECISION" ||
    sim.projectedKind === "REFLECT" ||
    sim.projectedKind === "ARTIFACT";
  const ok =
    hit ||
    conversationalOk ||
    sim.forkCount > 0 ||
    Boolean(sim.orchestrator.actions?.length);
  return {
    id: "output_input_alignment",
    ok,
    detail: ok ? undefined : "output_does_not_reflect_input",
  };
}

function checkDataIntegrity(sim: AdaptiveSimulation): QaCheckResult {
  const cafe = sim.orchestrator.cafeDiscovery?.options ?? [];
  const entity = sim.orchestrator.entityQuickPick?.options ?? [];
  const cafeOk =
    cafe.length === 0 || cafe.every((option) => Boolean(option.name?.trim()));
  const entityOk =
    entity.length === 0 ||
    entity.every((option) => Boolean(option.label?.trim()));
  const actions = sim.orchestrator.actions ?? [];
  const actionOk =
    actions.length === 0 ||
    actions.every((action) => Boolean(action.label?.trim()));
  const ok = cafeOk && entityOk && actionOk;
  return {
    id: "data_integrity",
    ok,
    detail: ok ? undefined : "missing_payload_fields",
  };
}

function checkCausalTrace(sim: AdaptiveSimulation): QaCheckResult {
  const ok =
    sim.causalTrace.length >= 2 &&
    Boolean(sim.because?.trim()) &&
    sim.because !== GENERIC_CLARIFY;
  return {
    id: "causal_trace",
    ok,
    detail: ok ? undefined : "because_or_trace_missing",
  };
}

/** 10-point mandatory QA checklist — pass only when 10/10. */
export function evaluateAdaptiveQa(sim: AdaptiveSimulation): AdaptiveQaEvaluation {
  const checks: QaCheckResult[] = [
    checkIntentMatch(sim),
    checkSurfaceValidity(sim),
    checkForkConstraint(sim),
    checkPluginCorrectness(sim),
    checkStateConsistency(sim),
    checkActionExecutability(sim),
    checkUiMinimality(sim),
    checkOutputInputAlignment(sim),
    checkDataIntegrity(sim),
    checkCausalTrace(sim),
  ];

  const score = checks.filter((check) => check.ok).length;
  return {
    checks,
    score,
    pass: score >= 10,
  };
}

export function failedCheckSummaries(evaluation: AdaptiveQaEvaluation): string[] {
  return evaluation.checks
    .filter((check) => !check.ok)
    .map((check) => `${check.id}:${check.detail ?? "fail"}`);
}
