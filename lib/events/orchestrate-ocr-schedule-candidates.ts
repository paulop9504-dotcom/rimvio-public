import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  extractEventsFromOcr,
  formatOcrEventExtractionJson,
} from "@/lib/events/extract-events-from-ocr";
import type { OcrExtractedEvent } from "@/lib/events/ocr-event-extraction-types";
import {
  composerContextHasPhotoAttachment,
  parseOcrTextFromComposerContext,
} from "@/lib/events/parse-ocr-from-composer-context";
import { beginPendingEventReview } from "@/lib/event-kernel/review/review-state";

function formatClockLabel(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) {
    return iso;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute === 0) {
    return `${hour}시`;
  }
  return `${hour}시 ${minute}분`;
}

function formatTimeLabel(event: OcrExtractedEvent): string {
  if (event.time) {
    const [hour, minute] = event.time.split(":").map(Number);
    if (minute === 0) {
      return `${hour}시`;
    }
    return `${hour}시 ${minute}분`;
  }
  if (!event.start) {
    return "시간 미상";
  }
  return event.end
    ? `${formatClockLabel(event.start)}–${formatClockLabel(event.end)}`
    : formatClockLabel(event.start);
}

function formatEventLine(event: OcrExtractedEvent, index: number): string {
  const time = formatTimeLabel(event);
  const dateHint = event.date ? `${event.date} ` : "";
  const tentative = event.confidence < 0.65 ? " (확인 필요)" : "";
  return `${index + 1}. ${dateHint}${time} · ${event.title}${tentative}`;
}

function buildSummary(events: OcrExtractedEvent[]): string {
  const lines = events.map((event, index) => formatEventLine(event, index));
  return [
    `사진에서 일정 후보 ${events.length}건을 찾았어요.`,
    "",
    ...lines,
    "",
    "캘린더에는 아직 넣지 않았어요. 맞는지 확인해 주세요.",
  ].join("\n");
}

/**
 * OCR attachment → schedule candidates (extraction only, no calendar write).
 */
export function orchestrateOcrScheduleCandidates(input: {
  composerContext?: string | null;
  referenceDate?: string;
}): OrchestratorResult | null {
  const composerContext = input.composerContext?.trim();
  if (!composerContext) {
    return null;
  }

  const hasPhoto = composerContextHasPhotoAttachment(composerContext);
  const ocrText = parseOcrTextFromComposerContext(composerContext);

  if (hasPhoto && !ocrText) {
    return {
      summary:
        "사진에서 글자를 읽지 못했어요. 선명한 사진으로 다시 올려 주시거나, 일정을 짧게 적어 주세요.",
      actions: [],
      source: "rules",
      confidence: 0.85,
      disclosure: "medium",
      actionsRevealed: false,
      pendingConfirm: false,
      presentation: { mode: "ACTION" },
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      thought: "ocr_schedule · read_failed",
    };
  }

  if (!ocrText) {
    return null;
  }

  const referenceDate =
    input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const extraction = extractEventsFromOcr(ocrText, { referenceDate });

  if (extraction.events.length === 0) {
    if (!hasPhoto) {
      return null;
    }
    return {
      summary:
        "사진은 받았는데 일정으로 보이는 항목은 찾지 못했어요. 시간이 포함된 문장을 다시 찍어 주세요.",
      actions: [],
      source: "rules",
      confidence: 0.8,
      disclosure: "medium",
      actionsRevealed: false,
      pendingConfirm: false,
      presentation: { mode: "ACTION" },
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      thought: "ocr_schedule · no_candidates",
    };
  }

  const reviewState = beginPendingEventReview({ events: extraction.events });

  return {
    summary: buildSummary(extraction.events),
    actions: [],
    source: "rules",
    confidence: 0.9,
    disclosure: "medium",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "ACTION" },
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
      ocr_event_extraction: extraction,
      pending_event_candidates: true,
      event_review_state: reviewState,
    },
    thought: `ocr_schedule · ${extraction.events.length} candidates · pending_review`,
    meta: {
      intent_type: "NEW_TASK",
      requires_context_switch: false,
      ocr_event_extraction_json: formatOcrEventExtractionJson(extraction),
      pending_event_candidates: true,
      review_state: "PENDING_EVENT_REVIEW",
      review_candidate_ids: reviewState.candidateIds,
    },
  };
}
