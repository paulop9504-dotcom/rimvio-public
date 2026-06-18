import type {
  CandidateAction,
  ComposeDecisionInput,
  DecisionSurface,
  ProbabilityFieldOutput,
} from "@/lib/deos/decision/decision-contract-types";
import { filterProbabilityToCandidates } from "@/lib/deos/decision/rank-candidates";
import {
  filterCandidatesByEnvelope,
  isEnvelopeActive,
  validateActionAgainstEnvelope,
} from "@/lib/deos/risk/validate-risk-envelope";
import type { RiskEnvelopeVetoReason } from "@/lib/deos/risk/risk-envelope-types";

export type EnvelopeGateResult = {
  candidates: CandidateAction[];
  probability: ProbabilityFieldOutput;
  diagnostics: string[];
  earlyBlocked?: DecisionSurface;
};

function becauseForEnvelopeBlock(reason: string): string {
  switch (reason) {
    case "envelope_expired":
      return "실행 권한이 만료됐어요. 다시 승인해 주세요.";
    case "envelope_all_vetoed":
      return "지금 한도 안에서 할 수 있는 행동이 없어요.";
    case "kill_switch_tripped":
      return "전략이 중지된 상태예요. 새 주문은 넣을 수 없어요.";
    case "envelope_veto":
      return "지금은 이 행동을 진행할 수 없어요.";
    default:
      return "지금은 이 행동을 진행할 수 없어요.";
  }
}

function blockedSurface(
  input: ComposeDecisionInput,
  reason: string,
  because: string
): DecisionSurface {
  return {
    mode: "blocked",
    title: input.title ?? "오늘 일정",
    because,
    targetState: input.state.cardState,
    reason,
  };
}

/** Constraint-only — filters candidates; does not select winner. */
export function applyEnvelopeGateToCompose(
  input: ComposeDecisionInput
): EnvelopeGateResult {
  const diagnostics: string[] = [];

  if (!input.envelope || !input.envelopeUsage) {
    return {
      candidates: input.candidates,
      probability: input.probability,
      diagnostics,
    };
  }

  const { envelope, envelopeUsage } = input;

  if (!isEnvelopeActive(envelope, envelopeUsage.clockIso)) {
    return {
      candidates: [],
      probability: { ranked: [], fieldVersion: input.probability.fieldVersion },
      diagnostics: ["envelope_expired"],
      earlyBlocked: blockedSurface(
        input,
        "envelope_expired",
        becauseForEnvelopeBlock("envelope_expired")
      ),
    };
  }

  const filtered = filterCandidatesByEnvelope(
    input.candidates,
    envelope,
    envelopeUsage
  );

  if (filtered.length === 0) {
    return {
      candidates: [],
      probability: { ranked: [], fieldVersion: input.probability.fieldVersion },
      diagnostics: ["envelope_all_vetoed"],
      earlyBlocked: blockedSurface(
        input,
        "envelope_all_vetoed",
        becauseForEnvelopeBlock(
          envelope.killSwitch === "TRIPPED"
            ? "kill_switch_tripped"
            : "envelope_all_vetoed"
        )
      ),
    };
  }

  diagnostics.push("envelope_filter_applied");

  return {
    candidates: filtered,
    probability: filterProbabilityToCandidates(
      input.probability,
      filtered
    ),
    diagnostics,
  };
}

export function vetoActionForEnvelope(input: {
  action: CandidateAction;
  envelope: ComposeDecisionInput["envelope"];
  envelopeUsage: ComposeDecisionInput["envelopeUsage"];
  scopeId?: string;
}): { allowed: boolean; reason?: RiskEnvelopeVetoReason } {
  if (!input.envelope || !input.envelopeUsage) {
    return { allowed: true };
  }
  const veto = validateActionAgainstEnvelope({
    action: input.action,
    envelope: input.envelope,
    usage: input.envelopeUsage,
    scopeId: input.scopeId,
    checkRate: false,
  });
  return { allowed: veto.allowed, reason: veto.reason };
}

export function envelopeBlockedSurface(
  input: ComposeDecisionInput,
  vetoReason?: RiskEnvelopeVetoReason
): DecisionSurface {
  const reason = vetoReason ?? "envelope_veto";
  return blockedSurface(
    input,
    `envelope_veto:${reason}`,
    becauseForEnvelopeBlock(
      reason === "kill_switch_tripped" ? "kill_switch_tripped" : "envelope_veto"
    )
  );
}
