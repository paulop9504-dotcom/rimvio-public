import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type { PersistentEvent } from "@/lib/context-resolver/types";
import type {
  EventCriticality,
  GuardrailActionType,
  GuardrailUserIntent,
} from "@/lib/safety/types";

type ActionPattern = {
  action: GuardrailActionType;
  pattern: RegExp;
  description: (match: RegExpMatchArray, message: string) => string;
};

const ACTION_PATTERNS: ActionPattern[] = [
  {
    action: "DELETE",
    pattern:
      /(?:삭제|지워(?:줘|주세요)?|delete|remove|없애(?:줘|주세요)?)/iu,
    description: (_match, message) => `정보 삭제: ${trimIntent(message)}`,
  },
  {
    action: "CANCEL",
    pattern:
      /(?:취소(?:해(?:줘|주세요)?)?|cancel(?:led|lation)?|일정\s*(?:없애|빼|삭제))/iu,
    description: (_match, message) => `일정 취소: ${trimIntent(message)}`,
  },
  {
    action: "TRANSFER_FUNDS",
    pattern:
      /(?:송금|이체|transfer(?:\s+funds)?|결제(?:해(?:줘|주세요)?)?|pay(?:ment)?)/iu,
    description: (_match, message) => `금전 이동: ${trimIntent(message)}`,
  },
  {
    action: "BLOCK",
    pattern: /(?:차단|block|거절(?:해(?:줘|주세요)?)?|decline)/iu,
    description: (_match, message) => `차단/거절: ${trimIntent(message)}`,
  },
];

const HIGH_CRITICALITY_PATTERN =
  /(?:중요|vip|ceo|회장|면접|interview|긴급|urgent|핵심|board|이사회)/iu;

const MEDIUM_CRITICALITY_PATTERN =
  /(?:미팅|meeting|약속|appointment|고객|client|프레젠|presentation)/iu;

function trimIntent(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 120);
}

function inferCriticality(message: string, eventTitle?: string): EventCriticality {
  const haystack = `${message} ${eventTitle ?? ""}`;
  if (HIGH_CRITICALITY_PATTERN.test(haystack)) {
    return "HIGH";
  }
  if (MEDIUM_CRITICALITY_PATTERN.test(haystack)) {
    return "MEDIUM";
  }
  return "LOW";
}

function findScheduleEvent(
  message: string,
  existingSchedule?: ExistingScheduleInput
): { title: string; time?: string; location?: string } | null {
  if (!existingSchedule?.tasks?.length) {
    return null;
  }

  const normalized = message.toLowerCase();
  for (const task of existingSchedule.tasks) {
    const title = task.task?.trim();
    if (!title) {
      continue;
    }
    if (normalized.includes(title.toLowerCase())) {
      return { title, time: task.time, location: undefined };
    }
  }

  return existingSchedule.tasks[0]
    ? {
        title: existingSchedule.tasks[0].task,
        time: existingSchedule.tasks[0].time,
      }
    : null;
}

function buildEvent(
  message: string,
  referenceDate?: string,
  existingSchedule?: ExistingScheduleInput
): PersistentEvent & { criticality: EventCriticality } {
  const matched = findScheduleEvent(message, existingSchedule);
  const title = matched?.title ?? trimIntent(message).slice(0, 48);
  const criticality = inferCriticality(message, title);

  return {
    id: `guardrail-${title}-${referenceDate ?? "today"}`,
    title,
    start_time: matched?.time ?? referenceDate ?? new Date().toISOString(),
    location: matched?.location ?? "미지정",
    criticality,
  };
}

export function inferGuardrailIntent(input: {
  message: string;
  referenceDate?: string;
  existingSchedule?: ExistingScheduleInput;
}): GuardrailUserIntent | null {
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  for (const entry of ACTION_PATTERNS) {
    const match = message.match(entry.pattern);
    if (!match) {
      continue;
    }

    const event = buildEvent(message, input.referenceDate, input.existingSchedule);
    return {
      action: entry.action,
      action_description: entry.description(match, message),
      event,
    };
  }

  return null;
}
