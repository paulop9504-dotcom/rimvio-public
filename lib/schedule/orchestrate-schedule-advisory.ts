import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { compileScheduleAdvisoryWire } from "@/lib/schedule/compile-schedule-advisory";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import {
  isScheduleAdvisoryQuery,
  resolveAdvisoryEventPair,
} from "@/lib/schedule/parse-schedule-advisory";
import { inferExperienceMode } from "@/lib/experience/infer-experience-mode";
import {
  appendMemoryModeReason,
  scoreScheduleTradeoff,
} from "@/lib/schedule/score-schedule-tradeoff";
import type { ScheduleAdvisoryWire } from "@/lib/schedule/schedule-block-types";
import { formatKoreanTimeLabel } from "@/lib/schedule/schedule-time-utils";
import type { LinkActionItem } from "@/types/database";

function advisoryOptionsToActions(wire: ScheduleAdvisoryWire): LinkActionItem[] {
  return wire.options.map((option, index) => ({
    id: `schedule-advisory-${index}`,
    label: option.label,
    kind: "custom",
    payload: {
      scheduleAdvisory: true,
      scheduleAdvisoryPrompt: option.prompt,
      targetEventId: option.targetEventId,
    },
  }));
}

function advisoryToOrchestratorResult(wire: ScheduleAdvisoryWire): OrchestratorResult {
  return {
    summary: wire.summary,
    actions: advisoryOptionsToActions(wire),
    source: "rules",
    confidence: 0.91,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    schedule: {
      is_conflict: true,
      message: wire.reason,
      tasks: wire.events.map((event) => ({
        time: formatKoreanTimeLabel(event.startMinutes),
        task: `${event.title} (${event.vitality})`,
      })),
    },
    scheduleAdvisory: wire,
    presentation: { mode: "TIMELINE" },
    thought: `ScheduleAdvisory · overlap=${wire.overlap.overlapMinutes}m · move=${wire.recommendedEventId}`,
  };
}

/** Vitality + time block + reschedule cost — rule-based conflict advisory. */
export function orchestrateScheduleAdvisory(input: {
  message: string;
  existingSchedule?: ExistingScheduleInput;
}): OrchestratorResult | null {
  if (!isScheduleAdvisoryQuery(input.message)) {
    return null;
  }

  const pair = resolveAdvisoryEventPair({
    message: input.message,
    existingSchedule: input.existingSchedule,
  });

  if (!pair || pair.length < 2) {
    return null;
  }

  const [eventA, eventB] = pair;
  const experienceMode = inferExperienceMode(input.message);
  const tradeoff = scoreScheduleTradeoff(eventA, eventB, experienceMode);
  const wire = compileScheduleAdvisoryWire({ events: [eventA, eventB], tradeoff });
  wire.reason = appendMemoryModeReason(wire.reason, experienceMode);

  if (wire.overlap.overlapMinutes <= 0) {
    return {
      summary: "두 일정은 시간 블록상 크게 겹치지 않아요. 그대로 진행해도 괜찮아 보여요.",
      actions: [],
      source: "rules",
      confidence: 0.78,
      actionsRevealed: true,
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      thought: "ScheduleAdvisory · no block overlap",
    };
  }

  return advisoryToOrchestratorResult(wire);
}
