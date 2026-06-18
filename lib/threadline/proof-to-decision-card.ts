import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type {
  DecisionCardModel,
  DecisionCardState,
  ForkChip,
  ReviewDeltaRow,
} from "@/lib/threadline/threadline-types";
import { getReviewState } from "@/lib/event-kernel/review/review-state";

export type ProofProjectionInput = {
  proof: CausalProof;
  sending?: boolean;
  gatePhase?: "awaiting_date" | "awaiting_confirm" | null;
};

function titleFromProof(proof: CausalProof): string {
  const pending = proof.stateAfter.pendingCandidates[0];
  if (pending?.title?.trim()) {
    return pending.title.trim();
  }
  if (proof.input.action && proof.input.action !== "맞아") {
    return proof.input.action.slice(0, 48);
  }
  return "오늘 일정";
}

/** One sentence — no engine terms (Kernel §8). */
export function becauseFromProof(proof: CausalProof): string {
  if (proof.uiDiff === "show DATE_PICKER") {
    return "사진 일정은 맞는데, 이 항목에 날짜가 아직 없어요.";
  }
  if (proof.uiDiff === "show CONFIRM_SCREEN") {
    return "날짜를 골랐어요. 캘린더에 넣기 전에 한 번만 확인해 주세요.";
  }
  if (proof.uiDiff === "calendar_update + action_overlay") {
    return "확인해 주셔서 캘린더와 오늘 할 일에 반영했어요.";
  }
  if (proof.commitDecision === "BLOCKED") {
    return "아직 마무리할 수 없는 항목이 있어요.";
  }
  if (proof.execution.blockedByLock) {
    return "잠시만요. 다른 처리가 끝나면 이어서 할게요.";
  }
  return "오늘 일정을 정리하고 있어요.";
}

export function settledLineFromProof(proof: CausalProof): string {
  const pending = proof.stateAfter.pendingCandidates[0];
  const date = pending?.date;
  const time = pending?.time;
  const title = titleFromProof(proof);

  if (proof.commitDecision === "PENDING_CONFIRM") {
    const parts = [title];
    if (date) {
      parts.push(date);
    }
    return `${parts.join(" · ")} · 확인 대기`;
  }

  const parts = [title];
  if (date) {
    parts.push(date);
  }
  if (time) {
    parts.push(time);
  }
  parts.push("캘린더에 반영됨");
  return parts.join(" · ");
}

function defaultDatePatches(): Array<{ candidateId: string; date: string }> {
  return getReviewState().candidateIds.map((candidateId) => ({
    candidateId,
    date: "2026-06-03",
  }));
}

function chipsForWaiting(
  proof: CausalProof,
  gatePhase: ProofProjectionInput["gatePhase"]
): ForkChip[] | undefined {
  if (proof.uiDiff === "show DATE_PICKER" || gatePhase === "awaiting_date") {
    return [
      {
        id: "date_default",
        label: "6월 3일",
        role: "default",
      },
      {
        id: "date_alt",
        label: "다른 날",
        role: "alternative",
      },
      {
        id: "defer",
        label: "나중에",
        role: "escape",
      },
    ];
  }

  if (proof.uiDiff === "show CONFIRM_SCREEN" || gatePhase === "awaiting_confirm") {
    return [
      {
        id: "confirm_default",
        label: "확인",
        role: "default",
      },
      {
        id: "date_alt",
        label: "날짜 바꾸기",
        role: "alternative",
      },
      {
        id: "defer",
        label: "나중에",
        role: "escape",
      },
    ];
  }

  if (proof.commitDecision === "BLOCKED") {
    return [
      {
        id: "approve_default",
        label: "맞아",
        role: "default",
      },
      {
        id: "defer",
        label: "나중에",
        role: "escape",
      },
    ];
  }

  return undefined;
}

export function reviewDeltasFromProof(proof: CausalProof): ReviewDeltaRow[] {
  const rows: ReviewDeltaRow[] = [];
  const before = proof.stateBefore.pendingCandidates[0];
  const after = proof.stateAfter.pendingCandidates[0];

  if (before?.date !== after?.date) {
    rows.push({
      label: "날짜",
      value: `${before?.date ?? "—"} → ${after?.date ?? "—"}`,
    });
  }

  if (proof.ssotDelta.changed) {
    rows.push({
      label: "캘린더",
      value: "반영됨",
    });
  }

  if (proof.stateDiff.scheduledEventDelta !== 0) {
    rows.push({
      label: "일정 수",
      value: `+${proof.stateDiff.scheduledEventDelta}`,
    });
  }

  return rows.slice(0, 3);
}

export function cardStateFromProof(input: ProofProjectionInput): DecisionCardState {
  if (input.sending) {
    return "WORKING";
  }
  if (
    input.proof.uiDiff === "calendar_update + action_overlay" ||
    input.proof.commitDecision === "EXECUTED"
  ) {
    return "DONE";
  }
  if (
    input.proof.uiDiff === "show DATE_PICKER" ||
    input.proof.uiDiff === "show CONFIRM_SCREEN" ||
    input.proof.commitDecision === "BLOCKED" ||
    input.proof.commitDecision === "PENDING_CONFIRM" ||
    input.gatePhase
  ) {
    return "WAITING";
  }
  return "DONE";
}

export function proofToDecisionCard(input: ProofProjectionInput): DecisionCardModel {
  const state = cardStateFromProof(input);
  const title = titleFromProof(input.proof);
  const because = becauseFromProof(input.proof);

  const model: DecisionCardModel = {
    id: `card:${input.proof.proofHash}`,
    state,
    title,
    because,
    proof: input.proof,
    updatedAt: input.proof.input.clockIso,
  };

  if (state === "WAITING") {
    model.chips = chipsForWaiting(input.proof, input.gatePhase);
  } else if (state === "DONE") {
    model.settledLine = settledLineFromProof(input.proof);
    model.reviewDeltas = reviewDeltasFromProof(input.proof);
  }

  return model;
}

export function resolvePayloadFromChip(
  chipId: string
): import("@/lib/threadline/threadline-types").ResolveChipPayload | null {
  switch (chipId) {
    case "date_default":
      return { kind: "ocr_date", patches: defaultDatePatches() };
    case "date_alt":
      return { kind: "open_date_picker" };
    case "confirm_default":
      return { kind: "ocr_confirm", message: "응" };
    case "approve_default":
      return { kind: "ocr_approve", message: "맞아" };
    case "defer":
      return { kind: "defer" };
    default:
      return null;
  }
}
