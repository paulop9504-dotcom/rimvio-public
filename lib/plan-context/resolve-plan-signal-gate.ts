import type { LlmActionCandidateWire } from "@/lib/llm-action-candidate-generator/types";
import type { PlanContext, PlanMode } from "@/lib/plan-context/plan-context-types";

const PERSONAL_VITALITY_PLUGIN = /^(?:vitality|wellness|rest|sleep|hydration)\./i;
const PERSONAL_VITALITY_TEXT =
  /(?:vitality|fatigue|hunger|sleep|coffee break|personal condition|컨디션|피곤|졸림|휴식|커피\s*한잔|체력)/iu;

export type PlanSignalGate = {
  planMode: PlanMode;
  allowPersonalVitality: boolean;
  allowLlmVitalitySignals: boolean;
};

export function inferPlanMode(plan: PlanContext | null | undefined): PlanMode {
  if (!plan) {
    return "solo";
  }
  if (plan.planMode) {
    return plan.planMode;
  }
  return plan.peerDisplayName?.trim() ? "group" : "solo";
}

/** Group plans — shared layer; personal vitality / LLM body-state signals off by default. */
export function resolvePlanSignalGate(plan: PlanContext | null | undefined): PlanSignalGate {
  const planMode = inferPlanMode(plan);
  if (planMode === "solo") {
    return {
      planMode,
      allowPersonalVitality: true,
      allowLlmVitalitySignals: true,
    };
  }
  return {
    planMode,
    allowPersonalVitality: false,
    allowLlmVitalitySignals: false,
  };
}

export function isPersonalVitalityCandidate(candidate: {
  label: string;
  reason?: string;
  plugin?: string;
}): boolean {
  if (candidate.plugin && PERSONAL_VITALITY_PLUGIN.test(candidate.plugin)) {
    return true;
  }
  const blob = [candidate.label, candidate.reason].filter(Boolean).join(" ");
  return PERSONAL_VITALITY_TEXT.test(blob);
}

export function filterCandidatesForPlanGate(
  candidates: readonly LlmActionCandidateWire[],
  gate: PlanSignalGate,
): LlmActionCandidateWire[] {
  if (gate.allowPersonalVitality) {
    return [...candidates];
  }
  return candidates.filter((candidate) => !isPersonalVitalityCandidate(candidate));
}
