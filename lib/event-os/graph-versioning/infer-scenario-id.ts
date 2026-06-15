import type { CausalProof } from "@/lib/event-os/causal-proof-types";

/** Map proof shape → golden registry scenario id (deterministic). */
export function inferScenarioId(proof: CausalProof): string | null {
  const step = proof.input.step;
  const validation = proof.validationProof.result;
  const uiDiff = proof.uiDiff;
  const commit = proof.commitDecision;

  if (
    step === "approve" &&
    validation === "MISSING_DATE" &&
    commit === "BLOCKED" &&
    uiDiff === "show DATE_PICKER"
  ) {
    return "ocr_approve_missing_date";
  }

  if (
    step === "date" &&
    commit === "PENDING_CONFIRM" &&
    !proof.ssotDelta.changed
  ) {
    return "ocr_date_resolved";
  }

  if (
    step === "confirm" &&
    commit === "EXECUTED" &&
    uiDiff === "calendar_update + action_overlay"
  ) {
    return "ocr_confirm_executed";
  }

  return null;
}
