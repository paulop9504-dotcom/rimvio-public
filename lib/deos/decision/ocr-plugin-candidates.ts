import type { OcrReviewDatePickerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { CandidateAction } from "@/lib/deos/decision/decision-contract-types";

/** Internal plugin — supplies candidates only (no decision). */
export function ocrReviewCandidatesFromTrigger(
  trigger: OcrReviewDatePickerWire,
  gatePhase: "awaiting_date" | "awaiting_confirm" = "awaiting_date"
): CandidateAction[] {
  const patches = trigger.rows.map((row) => ({
    candidateId: row.candidateId,
    date: "2026-06-03",
  }));

  if (gatePhase === "awaiting_confirm") {
    return [
      {
        id: "ocr:confirm",
        pluginId: "internal.ocr_review",
        source: "internal",
        label: "확인",
        kind: "ocr_confirm",
        payload: { message: "응" },
        becauseHint: "날짜를 골랐어요. 캘린더에 넣기 전에 한 번만 확인해 주세요.",
      },
      {
        id: "ocr:date_alt",
        pluginId: "internal.ocr_review",
        source: "internal",
        label: "날짜 바꾸기",
        kind: "ocr_open_date_picker",
        payload: { trigger },
      },
      {
        id: "ocr:defer",
        pluginId: "internal.ocr_review",
        source: "internal",
        label: "나중에",
        kind: "defer",
        payload: {},
      },
    ];
  }

  return [
    {
      id: "ocr:date_default",
      pluginId: "internal.ocr_review",
      source: "internal",
      label: "6월 3일",
      kind: "ocr_date",
      payload: { patches },
    },
    {
      id: "ocr:date_alt",
      pluginId: "internal.ocr_review",
      source: "internal",
      label: "다른 날",
      kind: "ocr_open_date_picker",
      payload: { trigger },
    },
    {
      id: "ocr:defer",
      pluginId: "internal.ocr_review",
      source: "internal",
      label: "나중에",
      kind: "defer",
      payload: {},
    },
  ];
}
