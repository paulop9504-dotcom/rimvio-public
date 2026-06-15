import { buildExtractedDataFromText } from "@/lib/action-chat/confirmation-logic";
import { parseRelativeDateTimeFromText } from "@/lib/action-chat/action-agent-normalize";
import {
  isFutureScheduledDatetime,
  type ScheduledActionDelivery,
} from "@/lib/action-chat/scheduled-action-delivery";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  classifyTimeExpression,
  isRelativeTimeExpression,
} from "@/lib/time-decision/classify-time-expression";
import {
  compileFutureTimeChoice,
  compilePastTimeChoice,
  compileRelativeCountdownSummary,
} from "@/lib/time-decision/compile-time-choice";
import { classifyTimeChoiceFollowUp } from "@/lib/time-decision/classify-time-choice-follow-up";
import { buildTimeChoiceExecutionResult } from "@/lib/time-decision/build-time-choice-execution";
import { parseAbsoluteTimeFromText } from "@/lib/time-decision/parse-absolute-time";
import {
  countScheduleLines,
  isScheduleListBatchCandidate,
} from "@/lib/schedule/parse-schedule-list-batch";
import type { TimeChoiceWire } from "@/lib/time-decision/types";
import type { LinkActionItem } from "@/types/database";

const SCHEDULE_INTENT =
  /(?:일정|약속|미팅|회의|예약|알람|리마인|타이머|치과|병원|미용|헤어|네일|점심|저녁|식사|만남|수업|강의)/u;

const PLACE_CATEGORY =
  /(?:치과|병원|미용|헤어|네일|카페|식당|맛집|약국|학원|센터|클리닉)/u;

function timeChoiceActions(wire: TimeChoiceWire): LinkActionItem[] {
  return wire.options.map((option, index) => ({
    id: `time-choice-${index}`,
    label: option.label,
    kind: "custom",
    payload: {
      timeChoice: true,
      timeChoicePrompt: option.prompt,
      timeChoiceMode: option.mode,
      datetime: wire.datetime_iso,
      task: wire.task_label,
    },
  }));
}

function timeChoiceResult(wire: TimeChoiceWire): OrchestratorResult {
  const summary = wire.missing_place_note
    ? `${wire.empathy_line} ${wire.missing_place_note}`
    : wire.empathy_line;

  return {
    summary: summary.slice(0, 160),
    actions: timeChoiceActions(wire),
    source: "rules",
    confidence: 0.93,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    timeChoice: wire,
    scheduleExtract: {
      datetime: wire.datetime_iso,
      place_name: null,
      address: null,
      phone: null,
      url: null,
    },
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    presentation: { mode: "TIME_CHOICE" },
    thought: `TimeDecision · absolute · locked=${wire.time_locked} · ${wire.task_label}`,
  };
}

function relativeCountdownResult(input: {
  message: string;
  referenceDate: string;
  datetime: string;
}): OrchestratorResult | null {
  if (!isFutureScheduledDatetime(input.datetime)) {
    return null;
  }

  const extracted = buildExtractedDataFromText(input.message, input.referenceDate);
  extracted.datetime = input.datetime;

  const scheduledDelivery: ScheduledActionDelivery = {
    fire_at: input.datetime,
    status: "pending",
  };

  const placeLabel = extracted.place_name ?? extracted.task_label ?? "일정";

  return {
    summary: compileRelativeCountdownSummary({
      message: input.message,
      datetimeIso: input.datetime,
    }),
    actions: [],
    source: "rules",
    confidence: 0.94,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    scheduledDelivery,
    scheduleExtract: extracted,
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    presentation: { mode: "TIMELINE" },
    thought: "TimeDecision · relative · countdown",
  };
}

function shouldHandleMessage(message: string): boolean {
  const kind = classifyTimeExpression(message).kind;
  if (kind === "relative") {
    return true;
  }
  if (kind === "absolute") {
    return SCHEDULE_INTENT.test(message) || PLACE_CATEGORY.test(message);
  }
  return false;
}

const TRAVEL_RELATIVE =
  /(?:가야|갈\s*거|출발|이동|행|만날|볼\s*거)|(?:[가-힣A-Za-z0-9]{2,12}역|[가-힣A-Za-z0-9]{2,12}공항)/u;

function shouldDeferRelativeToTravel(message: string): boolean {
  return TRAVEL_RELATIVE.test(message);
}

/**
 * Time Decision Logic — runs before place Missing / calendar heuristics.
 * Relative → countdown. Absolute → verify past/future then ASK_TIME_CHOICE.
 */
export function orchestrateTimeDecision(input: {
  message: string;
  referenceDate?: string;
  now?: Date;
}): OrchestratorResult | null {
  const message = input.message.trim();
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const now = input.now;

  if (!message) {
    return null;
  }

  if (isScheduleListBatchCandidate(message) || countScheduleLines(message) >= 2) {
    return null;
  }

  if (!shouldHandleMessage(message)) {
    return null;
  }

  if (isRelativeTimeExpression(message)) {
    if (shouldDeferRelativeToTravel(message)) {
      return null;
    }
    const datetime = parseRelativeDateTimeFromText(message, referenceDate);
    if (!datetime) {
      return null;
    }
    return relativeCountdownResult({ message, referenceDate, datetime });
  }

  const parsed = parseAbsoluteTimeFromText({ message, referenceDate, now });
  if (!parsed) {
    return null;
  }

  const missingPlace =
    PLACE_CATEGORY.test(message) &&
    !/(?:역|동\s+\d|로\s+\d|길\s+\d)/u.test(message);

  const followUpMode = classifyTimeChoiceFollowUp(message);
  if (followUpMode) {
    const executed = buildTimeChoiceExecutionResult({
      message,
      referenceDate,
      parsed,
      mode: followUpMode,
      missingPlace,
    });
    if (executed) {
      return executed;
    }
  }

  const wire = parsed.isPastToday
    ? compilePastTimeChoice({ message, parsed, missingPlace })
    : compileFutureTimeChoice({ message, parsed, missingPlace });

  return timeChoiceResult(wire);
}

export function isTimeDecisionQuery(message: string): boolean {
  return shouldHandleMessage(message);
}
