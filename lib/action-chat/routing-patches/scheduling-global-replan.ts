import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";
import { detectScheduleConflict } from "@/lib/schedule/day-schedule";
import { summarizeOverlapPriority } from "@/lib/schedule-intelligence/resolve-overlap-priority";
import type { ScheduleIntelligenceContext } from "@/lib/schedule-intelligence/types";

const GLOBAL_REPLAN =
  /(?:다\s*갈아(?:엎|엎어)|재설계|전체\s*변경|하루\s*완전|루틴\s*다시|일정\s*다\s*무시|계획\s*다\s*갈아|다시\s*최적화)/u;

export function isGlobalReplanInput(message: string): boolean {
  return GLOBAL_REPLAN.test(message.trim());
}

function toScheduleContext(
  referenceDate: string,
  existing: ExistingScheduleInput
): ScheduleIntelligenceContext {
  return {
    referenceDate,
    reminders: existing.map((item, index) => ({
      id: `existing-${index}`,
      title: item.task,
      fireAt: `${referenceDate}T${item.time.length === 4 ? `0${item.time}` : item.time}:00`,
    })),
    goals: [],
  };
}

/**
 * PATCH 3 — GLOBAL_REPLAN: keep existing schedule visible, rebalance instead of blind overwrite.
 */
export function orchestrateGlobalReplan(input: {
  message: string;
  referenceDate: string;
  existingSchedule: ExistingScheduleInput;
}): OrchestratorResult {
  const existing = input.existingSchedule;
  const context = toScheduleContext(input.referenceDate, existing);

  const overlap = summarizeOverlapPriority({
    message: input.message,
    context,
  });

  const proposed: ExistingScheduleInput = existing.map((item) => ({
    ...item,
    task: item.task,
  }));

  const { isConflict, overlaps } = detectScheduleConflict({
    proposed,
    existing,
    bufferMinutes: 15,
  });

  const existingLines = existing
    .slice(0, 5)
    .map((item) => `· ${item.time} ${item.task}`)
    .join("\n");

  const resolutionLines = [
    "1. [RESCHEDULE] 겹치는 블록 30분씩 재배치",
    "2. [MERGE] 인접 일정 하나로 묶기",
    "3. [DEFER] 우선순위 낮은 항목 내일로",
  ];

  const conflictNote =
    overlaps.length > 0
      ? `\n\n⚠ 겹침 ${overlaps.length}건 — 기존 일정은 유지한 채 조정이 필요해요.`
      : "";

  const summary = [
    "**오늘 일정 전체 재조정** 모드예요. 기존 일정은 무시하지 않고 **리밸런스**합니다.",
    "",
    "현재 일정:",
    existingLines || "· (등록된 일정 없음)",
    "",
    overlap?.summary ? `충돌 분석: ${overlap.summary}` : "",
    "",
    "추천 해결:",
    ...resolutionLines,
    conflictNote,
    "",
    "👉 어떤 방식으로 재배치할까요? (RESCHEDULE / MERGE / DEFER)",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary,
    actions: [
      {
        id: "global-replan-reschedule",
        label: "재배치 (RESCHEDULE)",
        kind: "custom",
        payload: { globalReplan: true, strategy: "RESCHEDULE" },
      },
      {
        id: "global-replan-merge",
        label: "합치기 (MERGE)",
        kind: "custom",
        payload: { globalReplan: true, strategy: "MERGE" },
      },
      {
        id: "global-replan-defer",
        label: "미루기 (DEFER)",
        kind: "custom",
        payload: { globalReplan: true, strategy: "DEFER" },
      },
    ],
    source: "rules",
    confidence: 0.88,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
      ai_intent: "HOW_TO",
      semantic_reason: "global_replan_rebalance",
      routing_patch: "PATCH3_SCHEDULING_OVERRIDE",
      global_replan_mode: "REBALANCE",
      ignore_existing_schedule: false,
    },
    presentation: { mode: "TIMELINE" },
    schedule: {
      is_conflict: isConflict,
      message: "GLOBAL_REPLAN — existing schedule preserved, rebalance recommended",
      tasks: existing,
    },
    thought: `GlobalReplan · conflicts=${overlaps.length} · rebalance=true`,
  };
}
