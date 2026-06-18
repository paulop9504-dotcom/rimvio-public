import type { OcrReviewDatePickerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { DecisionCardModel, ForkChip } from "@/lib/threadline/threadline-types";

export const THREADLINE_ACTIVE_OCR_CARD_ID = "card:ocr-active";

const DATE_CHIPS: ForkChip[] = [
  { id: "date_default", label: "6월 3일", role: "default" },
  { id: "date_alt", label: "다른 날", role: "alternative" },
  { id: "defer", label: "나중에", role: "escape" },
];

const CONFIRM_CHIPS: ForkChip[] = [
  { id: "confirm_default", label: "확인", role: "default" },
  { id: "date_alt", label: "날짜 바꾸기", role: "alternative" },
  { id: "defer", label: "나중에", role: "escape" },
];

/** Seed WAITING card before first CausalProof (OCR ingress). */
export function waitingCardFromOcrTrigger(
  trigger: OcrReviewDatePickerWire,
  gatePhase: "awaiting_date" | "awaiting_confirm" = "awaiting_date"
): DecisionCardModel {
  const primary = trigger.rows[0];
  const title = primary?.title?.trim() || "오늘 일정";

  const because =
    gatePhase === "awaiting_confirm"
      ? "날짜를 골랐어요. 캘린더에 넣기 전에 한 번만 확인해 주세요."
      : "사진에서 일정을 찾았어요. 날짜만 정하면 바로 이어갈 수 있어요.";

  return {
    id: THREADLINE_ACTIVE_OCR_CARD_ID,
    state: "WAITING",
    title,
    because,
    chips: gatePhase === "awaiting_confirm" ? CONFIRM_CHIPS : DATE_CHIPS,
    updatedAt: new Date().toISOString(),
  };
}
