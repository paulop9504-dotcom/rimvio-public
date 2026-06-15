import { buildExtractedDataFromText, buildConfirmationOrchestratorResult } from "@/lib/action-chat/confirmation-logic";
import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import { eventIntentKindLabel } from "@/lib/event-commit-gate/parse-event-intent";
import type {
  ClarifyMode,
  CommitSlotName,
  ParsedEventIntent,
} from "@/lib/event-commit-gate/types";

function slotQuestion(
  slot: CommitSlotName,
  intentLabel: string,
  mode: ClarifyMode,
): { persona: string; prompt: string } {
  switch (slot) {
    case "location":
      if (mode === "schedule_confirm") {
        return {
          persona: `${intentLabel} 일정이시네요. 어디로 가는지는 아직 확실하지 않아요. **일정으로 등록**할까요?`,
          prompt: "캘린더에 일정으로 등록할까요?",
        };
      }
      return {
        persona: "어디로 가시는지 알려주시면 바로 이어갈게요.",
        prompt: "목적지를 알려주세요.",
      };
    case "place":
      return {
        persona: `${intentLabel} 일정이시네요. **어디서**인지 알려주시면 일정으로 등록할게요.`,
        prompt: "장소를 알려주시거나, 지금 정보로 일정 등록할까요?",
      };
    case "datetime":
      return {
        persona: `${intentLabel} 일정으로 이해했어요. **언제**로 잡을까요?`,
        prompt: "날짜·시간을 알려주시거나, 일정 등록을 이어갈까요?",
      };
    case "target":
      return {
        persona: "어떤 기준으로 볼까요? **지역·메뉴·분위기** 중 하나만 말해 주세요.",
        prompt: "무엇을 기준으로 도와드릴까요?",
      };
    case "recipient":
      return {
        persona: "누구/어디로 할지 알려주시면 바로 이어갈게요.",
        prompt: "대상을 알려주세요.",
      };
    default:
      return {
        persona: "조금만 더 알려주시면 바로 이어갈게요.",
        prompt: "추가 정보를 알려주세요.",
      };
  }
}

function buildScheduleExtract(
  intent: ParsedEventIntent,
  message: string,
  referenceDate: string,
) {
  const extracted = buildExtractedDataFromText(message, referenceDate);
  const place =
    intent.filled_slots.location ??
    intent.filled_slots.place ??
    extracted.place_name;

  return {
    ...extracted,
    place_name: place ?? null,
    datetime: extracted.datetime ?? intent.filled_slots.datetime ?? null,
    title: intent.title,
  };
}

export function buildSlotClarifyResult(input: {
  intent: ParsedEventIntent;
  message: string;
  referenceDate: string;
}): OrchestratorResult {
  const { intent, message, referenceDate } = input;
  const slot = intent.primary_missing ?? intent.missing_slots[0] ?? "location";
  const mode = intent.clarify_mode ?? "slot_collect";
  const intentLabel = eventIntentKindLabel(intent.intent);
  const timePart = intent.time_expression ? ` **${intent.time_expression}**` : "";
  const { persona, prompt } = slotQuestion(slot, intentLabel, mode);

  const personaWithTime =
    slot === "location" && mode === "schedule_confirm" && timePart
      ? persona.replace("일정이시네요.", `일정이시네요.${timePart}`)
      : persona;

  if (mode === "schedule_confirm") {
    const clarify = buildConfirmationOrchestratorResult({
      persona_message: personaWithTime,
      data_prompt: prompt,
      extracted_data: {
        ...buildExtractedDataFromText(message, referenceDate),
        place_name: intent.filled_slots.location ?? intent.filled_slots.place ?? null,
        schedule_note: intent.schedule_note ?? intent.title,
      },
      confidence: intent.confidence,
      thought: `commit_gate_missing_${slot}`,
    });

    return {
      ...clarify,
      scheduleExtract: buildScheduleExtract(intent, message, referenceDate),
      metadata: mergeOrchestratorMetadata(clarify.metadata, {
        intent: "SCHEDULE",
        semantic_reason: "commit_gate_clarify",
        event_intent: intent.intent,
        missing_slots: intent.missing_slots,
        primary_missing: slot,
        clarify_mode: mode,
      }),
    };
  }

  const mealTargetForkActions =
    intent.intent === "meal" && slot === "target"
      ? [
          {
            id: "meal-fork-region",
            kind: "custom" as const,
            label: "지역 맛집",
            payload: { meal_criterion: "location", query: "근처 맛집" },
          },
          {
            id: "meal-fork-menu",
            kind: "custom" as const,
            label: "메뉴 추천",
            payload: { meal_criterion: "menu", query: message.trim() || "오늘 메뉴" },
          },
          {
            id: "meal-fork-vibe",
            kind: "custom" as const,
            label: "분위기 맛집",
            payload: { meal_criterion: "vibe", query: "분위기 좋은 식당" },
          },
        ]
      : [];

  return {
    summary: personaWithTime,
    actions: mealTargetForkActions,
    source: "rules",
    confidence: intent.confidence,
    disclosure: "medium",
    actionsRevealed: mealTargetForkActions.length > 0,
    pendingConfirm: false,
    metadata: mergeOrchestratorMetadata(undefined, {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
      semantic_reason: "commit_gate_slot_collect",
      event_intent: intent.intent,
      missing_slots: intent.missing_slots,
      primary_missing: slot,
      clarify_mode: mode,
    }),
    thought: `commit_gate_missing_${slot}`,
  };
}
