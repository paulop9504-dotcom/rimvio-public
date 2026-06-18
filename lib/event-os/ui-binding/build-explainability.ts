import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { ExplainabilityPanelModel } from "@/lib/event-os/ui-binding/ui-render-types";

function validationReasonFromProof(proof: CausalProof): string {
  const result = proof.validationProof.result;
  switch (result) {
    case "MISSING_DATE":
      return "MISSING_DATE → validation blocked until date is chosen";
    case "MISSING_TIME":
      return "MISSING_TIME → time required before commit";
    case "AMBIGUOUS_TITLE":
      return "AMBIGUOUS_TITLE → title must be clarified";
    case "RESOLVED":
      return "RESOLVED → all blocking fields satisfied";
    case "PASS":
      return "PASS → validation succeeded";
    default:
      return `${result} → no blocking validation signal`;
  }
}

function commitDecisionReasonFromProof(proof: CausalProof): string {
  const decision = proof.commitDecision;
  const route = proof.execution.executionRoute;
  const parts = [`${decision}`];
  if (route) {
    parts.push(`route=${route}`);
  }
  if (proof.plan.intendedCommit !== decision) {
    parts.push(`intended=${proof.plan.intendedCommit}`);
  }
  return parts.join(" · ");
}

function stateDiffSummaryFromProof(proof: CausalProof): string {
  const diff = proof.stateDiff;
  const ssot = proof.ssotDelta;
  const proj = proof.projectionDelta;
  return [
    `reviewStateChanged=${diff.reviewStateChanged}`,
    `scheduledEventΔ=${diff.scheduledEventDelta} (ssot ${ssot.before}→${ssot.after})`,
    `projectionΔ entries=${diff.projectionEntryDelta} rev=${diff.projectionRevisionDelta}`,
    `impact=${proj.impact}`,
    `pendingDatesResolved=${diff.pendingDatesResolved}`,
  ].join("; ");
}

function headlineFromProof(proof: CausalProof): string {
  if (proof.uiDiff === "show DATE_PICKER") {
    return "CASE: 날짜 없음 — DATE_PICKER 표시";
  }
  if (proof.uiDiff === "show CONFIRM_SCREEN") {
    return "CASE: confirm — 검토 후 확정 화면";
  }
  if (proof.uiDiff === "calendar_update + action_overlay") {
    const rows = proof.overlayRowCount ?? 0;
    return `CASE: commit — calendar update + overlay ${rows} rows`;
  }
  if (proof.commitDecision === "BLOCKED") {
    return "CASE: blocked — UI holds until proof changes";
  }
  return "CASE: no surface change (uiDiff none)";
}

/** Explainability projection — why the UI changed. */
export function buildExplainabilityFromProof(
  proof: CausalProof
): ExplainabilityPanelModel {
  return {
    proofHash: proof.proofHash,
    causalChain: [...proof.causalChain],
    validationReason: validationReasonFromProof(proof),
    commitDecisionReason: commitDecisionReasonFromProof(proof),
    stateDiffSummary: stateDiffSummaryFromProof(proof),
    uiDiff: proof.uiDiff,
    headline: headlineFromProof(proof),
  };
}
