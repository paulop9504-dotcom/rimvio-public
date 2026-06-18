import type {
  CommitGateDecision,
  EventCommitGateResult,
  ParsedEventIntent,
} from "@/lib/event-commit-gate/types";

/** Commit gate — missing slots force CLARIFY before prep / schedule writes. */
export function resolveEventCommitGate(
  intent: ParsedEventIntent,
): EventCommitGateResult {
  if (intent.missing_slots.length === 0 || !intent.primary_missing) {
    return { decision: "DIRECT_ACTION", intent };
  }

  return { decision: "CLARIFY", intent };
}

export function shouldBlockDirectExecution(gate: EventCommitGateResult): boolean {
  return gate.decision === "CLARIFY";
}
