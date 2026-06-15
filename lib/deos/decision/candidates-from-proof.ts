import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { OcrReviewDatePickerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { CandidateAction, DeosStateContext } from "@/lib/deos/decision/decision-contract-types";
import { ocrReviewCandidatesFromTrigger } from "@/lib/deos/decision/ocr-plugin-candidates";

function titleFromProof(proof: CausalProof): string {
  const pending = proof.stateAfter.pendingCandidates[0];
  return pending?.title?.trim() || "오늘 일정";
}

export function deosStateFromProof(
  proof: CausalProof,
  gatePhase?: DeosStateContext["gatePhase"]
): DeosStateContext {
  let cardState: DeosStateContext["cardState"] = "WAITING";
  if (proof.uiDiff === "calendar_update + action_overlay" || proof.commitDecision === "EXECUTED") {
    cardState = "DONE";
  } else if (proof.execution.blockedByLock) {
    cardState = "WAITING";
  }

  return {
    scopeId: proof.input.scopeId,
    cardState,
    activeCardId: `card:${proof.proofHash}`,
    gatePhase: gatePhase ?? inferGatePhase(proof),
  };
}

function inferGatePhase(
  proof: CausalProof
): DeosStateContext["gatePhase"] {
  if (proof.uiDiff === "show CONFIRM_SCREEN") {
    return "awaiting_confirm";
  }
  if (proof.uiDiff === "show DATE_PICKER") {
    return "awaiting_date";
  }
  return null;
}

export function ocrTriggerFromProof(proof: CausalProof): OcrReviewDatePickerWire {
  return {
    type: "OCR_REVIEW_DATE_PICKER",
    rows: proof.stateAfter.pendingCandidates.map((row) => ({
      candidateId: row.id,
      title: row.title,
      time: row.time,
    })),
  };
}

/** Plugin material derived from post-execution proof (still input-only). */
export function candidatesFromProof(
  proof: CausalProof,
  gatePhase?: DeosStateContext["gatePhase"]
): CandidateAction[] {
  const phase = gatePhase ?? inferGatePhase(proof);
  const trigger = ocrTriggerFromProof(proof);

  if (phase === "awaiting_confirm") {
    return ocrReviewCandidatesFromTrigger(trigger, "awaiting_confirm");
  }
  if (
    phase === "awaiting_date" ||
    proof.uiDiff === "show DATE_PICKER" ||
    proof.commitDecision === "BLOCKED"
  ) {
    return ocrReviewCandidatesFromTrigger(trigger, "awaiting_date");
  }

  if (proof.commitDecision === "EXECUTED") {
    return [
      {
        id: "ocr:done",
        pluginId: "internal.ocr_review",
        source: "internal",
        label: "완료",
        kind: "calendar_commit",
        payload: { proofHash: proof.proofHash },
        becauseHint: "확인해 주셔서 캘린더와 오늘 할 일에 반영했어요.",
      },
    ];
  }

  return ocrReviewCandidatesFromTrigger(trigger, "awaiting_date");
}

export function titleFromProofContext(proof: CausalProof): string {
  return titleFromProof(proof);
}
