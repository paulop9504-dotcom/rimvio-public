import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { TemporalResolution } from "@/lib/time/temporal-types";
import { resolveTemporalExpression } from "@/lib/time/temporal-resolver";
import { hasTemporalSchedulePattern } from "@/lib/time/temporal-parsing-protocol";
import { extractTaskLabelFromMessage } from "@/lib/time-decision/extract-task-label";
import { buildAgentOutput } from "@/lib/global-brain/agent-output-types";
import { extractNexusContactFromMessage } from "@/lib/nexus-db/contact-store";

const SCHEDULE_INTENT =
  /(?:일정|약속|미팅|회의|예약|가야|갈\s*거|치과|병원|미용|헤어|만남|상담|리마인)/u;

const TEMPORAL_NOISE =
  /(?:\d+|한|하루|일|두|세|네|다섯|여섯|일주)\s*(?:일|주|달|개월|년)\s*(?:뒤|후|이후)|(?:한|일)\s*달\s*(?:뒤|후)|(?:다음\s*(?:주|달|해|년)|내년|내일|모레)/giu;

function extractPlaceHint(message: string): string | null {
  const cleaned = message
    .replace(TEMPORAL_NOISE, " ")
    .replace(/(?:에|으로|로|가야|갈\s*거|해야|해\s*줘)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hint = cleaned.slice(0, 32);
  return hint.length >= 2 ? hint : null;
}

function countRemindersOnDate(
  dateKey: string,
  reminders?: Array<{ title: string; fireAt: string }>
): number {
  if (!reminders?.length) {
    return 0;
  }
  return reminders.filter((item) => item.fireAt.slice(0, 10) === dateKey).length;
}

/**
 * Temporal Resolver + schedule confirm card.
 * "1달 뒤에 치과" → computed date → CONFIRM UI.
 */
export function orchestrateTemporalSchedule(input: {
  message: string;
  referenceDate: string;
  now?: Date;
  allReminders?: Array<{ id: string; title: string; fireAt: string; url?: string }>;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message || !hasTemporalSchedulePattern(message) || !SCHEDULE_INTENT.test(message)) {
    return null;
  }

  const resolution = resolveTemporalExpression({
    message,
    referenceDate: input.referenceDate,
    now: input.now,
  });
  if (!resolution) {
    return null;
  }

  const taskLabel = extractTaskLabelFromMessage(message);
  const placeHint = extractPlaceHint(message);
  const existingOnDate = countRemindersOnDate(resolution.dateKey, input.allReminders);
  const nexusContact = extractNexusContactFromMessage(message);

  const scheduleNote =
    existingOnDate > 0
      ? `${resolution.displayLabel}에 일정 ${existingOnDate}개가 이미 있어요.`
      : `${resolution.displayLabel}은 비어 있어요.`;

  const agent = buildAgentOutput({
    action: "TEMPORAL_SCHEDULE",
    data: {
      dateKey: resolution.dateKey,
      iso: resolution.iso,
      task: taskLabel,
      place: placeHint,
    },
    reasoning: `${resolution.rawPhrase} → ${resolution.dateKey} (${resolution.intent})`,
    self_reflection: `TemporalResolver used library math, not LLM date guessing. ${scheduleNote}`,
  });

  const nexusLine = nexusContact
    ? ` ${nexusContact.name}님${nexusContact.lastContactAt ? " — 마지막 연락 기록 있음" : ""}.`
    : "";

  return {
    summary: `네, ${resolution.rawPhrase.includes("달") ? "한 달 뒤" : resolution.rawPhrase}인 **${resolution.displayLabel}**에 ${placeHint ?? taskLabel} 일정이시군요.${nexusLine} 저장해 드릴까요?`,
    actions: [],
    source: "rules",
    confidence: 0.94,
    disclosure: "high",
    actionsRevealed: false,
    pendingConfirm: true,
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    scheduleExtract: {
      datetime: resolution.iso,
      place_name: placeHint,
      address: null,
      phone: null,
      url: null,
    },
    confirmation: {
      meta: { intent: "CONFIRM" },
      thought: agent.self_reflection,
      persona_message: `**${resolution.displayLabel}**에 넣을게요.`,
      confirm_message: scheduleNote,
      confirm_data: {
        subject: resolution.dateKey,
        category: "TIME",
      },
      extracted_data: {
        datetime: resolution.iso,
        place_name: placeHint,
        address: null,
        phone: null,
        url: null,
      },
      witty_buttons: [
        { label: `${resolution.dateKey} 저장`, action: "confirm_schedule" },
        { label: "날짜 변경", action: "alternate_date" },
      ],
    },
    presentation: { mode: "ACTION" },
    thought: `TemporalResolver · ${resolution.rawPhrase} → ${resolution.dateKey} · ${agent.reasoning}`,
  };
}

export type { TemporalResolution };
