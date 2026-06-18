import type { CausalProof, CausalProofInput } from "@/lib/event-os/causal-proof-types";
import {
  runApproveStep,
  runConfirmStep,
  runDateStep,
} from "@/lib/event-os/execution-steps";

export type CounterfactualDiff = {
  field: string;
  baseline: unknown;
  simulated: unknown;
};

export type CounterfactualResult = {
  baseline: CausalProof;
  simulated: CausalProof;
  diffs: CounterfactualDiff[];
  ssotWouldChange: boolean;
};

function diffProofs(
  baseline: CausalProof,
  simulated: CausalProof
): CounterfactualDiff[] {
  const diffs: CounterfactualDiff[] = [];
  const pairs: Array<[string, unknown, unknown]> = [
    ["commitDecision", baseline.commitDecision, simulated.commitDecision],
    [
      "validationResult",
      baseline.validationProof.result,
      simulated.validationProof.result,
    ],
    ["uiDiff", baseline.uiDiff, simulated.uiDiff],
    ["ssotDelta.changed", baseline.ssotDelta.changed, simulated.ssotDelta.changed],
  ];

  for (const [field, base, sim] of pairs) {
    if (base !== sim) {
      diffs.push({ field, baseline: base, simulated: sim });
    }
  }
  return diffs;
}

function mergeInput(
  baseline: CausalProof,
  modified: Partial<CausalProofInput>
): CausalProofInput {
  return { ...baseline.input, ...modified };
}

/** Dry-run counterfactual — no SSOT writes (execution.dryRun = true). */
export function simulateCounterfactual(
  baseline: CausalProof,
  modifiedInput: Partial<CausalProofInput>
): CounterfactualResult {
  const input = mergeInput(baseline, modifiedInput);
  const scopeId = input.scopeId;
  const now = new Date(input.clockIso);

  let simulated: CausalProof;
  switch (input.step) {
    case "date":
      simulated = runDateStep({
        patches: input.patches ?? [],
        scopeId,
        now,
        dryRun: true,
      }).proof;
      break;
    case "confirm":
      simulated = runConfirmStep({
        message: input.action,
        scopeId,
        now,
        dryRun: true,
        syncClient: false,
      }).proof;
      break;
    case "approve":
    default:
      simulated = runApproveStep({
        message: input.action,
        scopeId,
        now,
        dryRun: true,
      }).proof;
      break;
  }

  const diffs = diffProofs(baseline, simulated);
  return {
    baseline,
    simulated,
    diffs,
    ssotWouldChange: simulated.ssotDelta.changed,
  };
}
