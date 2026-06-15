import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { orchestrateGoalAlignment } from "@/lib/goal-roadmap/orchestrate-goal-alignment";
import {
  applyReschedulePropagation,
  formatRescheduleSummary,
} from "@/lib/schedule-intelligence/apply-reschedule-propagation";
import {
  analyzeScheduleQuery,
  isScheduleIntelligenceQuery,
} from "@/lib/schedule-intelligence/parse-schedule-query";
import {
  formatRetrievalSummary,
  queryScheduleStore,
} from "@/lib/schedule-intelligence/query-schedule-store";
import { resolveDepartureAdvice } from "@/lib/schedule-intelligence/resolve-departure-query";
import { summarizeOverlapPriority } from "@/lib/schedule-intelligence/resolve-overlap-priority";
import type { ScheduleIntelligenceContext } from "@/lib/schedule-intelligence/types";
import { orchestrateScheduleAdvisory } from "@/lib/schedule/orchestrate-schedule-advisory";
import { buildScheduleRegisterPrompt } from "@/lib/schedule-intelligence/schedule-retrieval-action";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import type { LinkActionItem } from "@/types/database";

function retrievalActions(
  wire: ReturnType<typeof queryScheduleStore>,
  message: string
): LinkActionItem[] {
  if (wire.userInLoop) {
    return [
      {
        id: "schedule-retrieval-register",
        label: "일정 알려주기",
        kind: "custom",
        payload: {
          scheduleRetrievalRegister: true,
          scheduleRegisterPrompt: buildScheduleRegisterPrompt(message),
        },
      },
    ];
  }

  if (wire.items.length === 0) {
    return [];
  }
  return [
    {
      id: "schedule-retrieval-copy",
      label: "목록 복사",
      kind: "custom",
      payload: { scheduleRetrieval: true, items: wire.items },
    },
  ];
}

function goalActions(wire: ReturnType<typeof orchestrateGoalAlignment>): LinkActionItem[] {
  if (wire.studyBlocks?.length) {
    return wire.studyBlocks.slice(0, 3).map((block, index) => ({
      id: `study-block-${index}`,
      label: `${block.dateKey.slice(5)} ${block.time} 공부 잡기`,
      kind: "custom",
      payload: {
        studyBlock: block,
        datetime: `${block.dateKey}T${block.time}:00`,
        task: block.label,
      },
    }));
  }
  return [];
}

function toContext(input: {
  referenceDate: string;
  existingSchedule?: ExistingScheduleInput;
  reminders?: ScheduleIntelligenceContext["reminders"];
  goals?: ScheduleIntelligenceContext["goals"];
  activitySources?: ScheduleIntelligenceContext["activitySources"];
}): ScheduleIntelligenceContext {
  const reminders =
    input.reminders ??
    (input.existingSchedule ?? []).map((item, index) => ({
      id: `existing-${index}`,
      title: item.task,
      fireAt: `${input.referenceDate}T${item.time.length === 4 ? `0${item.time}` : item.time}:00`,
    }));

  return {
    referenceDate: input.referenceDate,
    reminders,
    goals: input.goals,
  };
}

/** 3-tier schedule intelligence — retrieval, conflict, goal alignment. */
export async function orchestrateScheduleIntelligence(input: {
  message: string;
  referenceDate?: string;
  existingSchedule?: ExistingScheduleInput;
  reminders?: ScheduleIntelligenceContext["reminders"];
  goals?: ScheduleIntelligenceContext["goals"];
  activitySources?: ScheduleIntelligenceContext["activitySources"];
}): Promise<OrchestratorResult | null> {
  const message = input.message.trim();
  if (!message || !isScheduleIntelligenceQuery(message)) {
    return null;
  }

  const analysis = analyzeScheduleQuery({
    message,
    referenceDate: input.referenceDate,
  });
  if (!analysis) {
    return null;
  }

  const context = toContext({
    referenceDate: input.referenceDate ?? new Date().toISOString().slice(0, 10),
    existingSchedule: input.existingSchedule,
    reminders: input.reminders,
    goals: input.goals,
    activitySources: input.activitySources,
  });

  if (analysis.tier === "goal") {
    const wire = orchestrateGoalAlignment({ analysis, context });
    return {
      summary: wire.summary,
      actions: goalActions(wire),
      source: "rules",
      confidence: 0.88,
      disclosure: "high",
      actionsRevealed: true,
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      presentation: { mode: wire.studyBlocks?.length ? "TIMELINE" : "DEFAULT" },
      thought: `GoalAlignment · ${wire.kind}${wire.score != null ? ` · score=${wire.score}` : ""}`,
      schedule: wire.studyBlocks?.length
        ? {
            is_conflict: false,
            message: wire.suggestions.join(" "),
            tasks: wire.studyBlocks.map((block) => ({
              time: block.time,
              task: block.label,
            })),
          }
        : undefined,
    };
  }

  if (analysis.kind === "departure_time") {
    const advice = await resolveDepartureAdvice({ analysis, context });
    if (!advice) {
      return null;
    }
    return {
      summary: advice.summary,
      actions: [
        {
          id: "departure-nav",
          label: `${advice.destination} 길찾기`,
          kind: "custom",
          payload: { place_name: advice.destination, departureAdvice: advice },
        },
      ],
      source: "rules",
      confidence: 0.9,
      disclosure: "high",
      actionsRevealed: true,
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      thought: `DepartureAdvice · leave=${advice.leaveBy}`,
    };
  }

  if (analysis.kind === "reschedule_propagation") {
    const wire = applyReschedulePropagation({ analysis, context });
    if (!wire) {
      return {
        summary: "연기할 일정을 찾지 못했어요. 일정 제목을 조금 더 구체적으로 알려 주세요.",
        actions: [],
        source: "rules",
        confidence: 0.7,
        actionsRevealed: true,
        metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      };
    }

    return {
      summary: formatRescheduleSummary(wire),
      actions: [],
      source: "rules",
      confidence: 0.87,
      disclosure: "high",
      actionsRevealed: true,
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      presentation: { mode: "TIMELINE" },
      schedule: {
        is_conflict: true,
        message: `${wire.shiftedTitle} ${wire.delayMinutes}분 연기 반영`,
        tasks: wire.revised.map((item) => ({
          time: item.time,
          task: item.note ? `${item.title} (${item.note})` : item.title,
        })),
      },
      thought: `ReschedulePropagation · delay=${wire.delayMinutes}m`,
    };
  }

  if (analysis.kind === "overlap_priority") {
    const advisory = orchestrateScheduleAdvisory({
      message,
      existingSchedule: input.existingSchedule,
    });
    if (advisory) {
      return advisory;
    }

    const overlap = summarizeOverlapPriority({
      message,
      context,
      labelA: analysis.eventLabelA,
      labelB: analysis.eventLabelB,
      dateKey: analysis.dateKey,
    });

    if (overlap) {
      return {
        summary: overlap.summary,
        actions: [],
        source: "rules",
        confidence: 0.86,
        disclosure: "high",
        actionsRevealed: true,
        metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
        thought: `OverlapPriority · keep=${overlap.keepTitle}`,
      };
    }
  }

  const retrieval = queryScheduleStore(analysis, context, message);
  return {
    summary: formatRetrievalSummary(retrieval),
    actions: retrievalActions(retrieval, message),
    source: "rules",
    confidence: retrieval.items.length ? 0.92 : retrieval.userInLoop ? 0.72 : 0.75,
    disclosure: "high",
    actionsRevealed: true,
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    presentation: {
      mode: retrieval.items.length ? "TIMELINE" : retrieval.userInLoop ? "DEFAULT" : "DEFAULT",
    },
    schedule: retrieval.items.length
      ? {
          is_conflict: false,
          message: retrieval.queryLabel,
          tasks: retrieval.items.map((item) => ({
            time: item.time,
            task: item.note ? `${item.title} (${item.note})` : item.title,
          })),
        }
      : undefined,
    thought: `DeepRetrieval · stage=${retrieval.retrievalStage ?? "?"} · count=${retrieval.items.length}`,
  };
}
