import { validateLinkActions } from "@/lib/actions/action-validator";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import {
  applyDisclosureToOrchestratorResult,
  normalizeConfidenceScore,
} from "@/lib/action-chat/action-confidence";
import {
  detectScheduleConflict,
  type DayScheduleTask,
} from "@/lib/schedule/day-schedule";
import { wireActionsToLinkItems } from "@/lib/action-chat/wire-to-actions";
import type {
  MasterOrchestratorWire,
  OrchestratorResult,
  OrchestratorScheduleWire,
} from "@/lib/action-chat/orchestrator-types";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

function trimSummary(text: string, source?: OrchestratorResult["source"]) {
  const maxLen = source === "conversation" ? 120 : 100;
  return text.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function mergeScheduleConflict(input: {
  wire: MasterOrchestratorWire;
  existingSchedule: ExistingScheduleInput;
}) {
  const proposed = input.wire.schedule?.tasks ?? [];
  if (proposed.length === 0) {
    return input.wire;
  }

  const conflict = detectScheduleConflict({
    proposed,
    existing: input.existingSchedule,
  });

  const schedule = {
    is_conflict: input.wire.schedule?.is_conflict ?? conflict.isConflict,
    message: input.wire.schedule?.message ?? "",
    tasks: proposed,
  };

  if (conflict.isConflict && !schedule.message) {
    const first = conflict.overlaps[0];
    schedule.message = first
      ? `${first.existing.time} ${first.existing.task}과 겹려요. ${first.proposed.time} 전후로 옮길까요?`
      : "기존 일정과 겹쳐요. 시간을 조정할까요?";
    schedule.is_conflict = true;
  }

  return { ...input.wire, schedule };
}

function appendContainerAction(
  actions: ReturnType<typeof wireActionsToLinkItems>,
  wire: MasterOrchestratorWire
) {
  const container = wire.container;
  if (!container?.should_save || container.action === "NONE" || !container.title?.trim()) {
    return actions;
  }

  const label =
    container.action === "UPDATE"
      ? `📁 ${container.title}에 추가`
      : `📁 ${container.title} 만들기`;

  if (actions.some((action) => action.label.includes(container.title))) {
    return actions;
  }

  return [
    ...actions,
    createOpenAction({
      label,
      href: `rimvio://container/${encodeURIComponent(container.title)}`,
      icon: "link",
      copyText: container.title,
      payload: { containerAction: container.action, containerTitle: container.title },
    }),
  ].slice(0, 4);
}

export function normalizeMasterOrchestratorWire(input: {
  wire: MasterOrchestratorWire;
  source: OrchestratorResult["source"];
  existingSchedule?: ExistingScheduleInput;
}): OrchestratorResult {
  const merged = mergeScheduleConflict({
    wire: input.wire,
    existingSchedule: input.existingSchedule ?? [],
  });

  let summary = trimSummary(merged.summary || "바로 실행할게요", input.source);

  if (merged.schedule?.is_conflict && merged.schedule.message) {
    summary = trimSummary(`${summary} ${merged.schedule.message}`, input.source);
  }

  if (merged.container?.should_save && merged.container.title && merged.container.action !== "NONE") {
    const hint =
      merged.container.action === "UPDATE"
        ? `${merged.container.title} 컨테이너에 넣을까요?`
        : `${merged.container.title} 컨테이너를 만들까요?`;
    if (!summary.includes("컨테이너")) {
      summary = trimSummary(`${summary} ${hint}`, input.source);
    }
  }

  const confidence = normalizeConfidenceScore(merged.confidence_score);

  if (merged.confirmation?.meta?.intent === "CONFIRM") {
    return {
      summary: merged.confirmation.persona_message ??
        merged.confirmation.confirm_message ??
        summary,
      actions: [],
      source: input.source,
      confidence: confidence ?? 0.78,
      disclosure: "high",
      actionsRevealed: false,
      pendingConfirm: true,
      thought: merged.thought ?? merged.confirmation.thought,
      metadata: merged.metadata,
      schedule: merged.schedule,
      container: merged.container,
      confirmation: merged.confirmation,
    };
  }

  if (merged.confirmation?.meta?.intent === "WITTY") {
    return {
      summary: merged.confirmation.persona_message ?? summary,
      actions: [],
      source: input.source,
      confidence: confidence ?? 1,
      disclosure: "none",
      actionsRevealed: false,
      pendingConfirm: true,
      thought: merged.thought ?? merged.confirmation.thought,
      metadata: merged.metadata,
      confirmation: merged.confirmation,
    };
  }

  if (!merged.actions?.length) {
    return {
      summary,
      actions: [],
      source: input.source,
      confidence: confidence ?? 1,
      disclosure: "none",
      actionsRevealed: false,
      pendingConfirm: false,
      metadata: merged.metadata,
      schedule: merged.schedule,
      container: merged.container,
      confirmation: merged.confirmation,
    };
  }

  const wired = validateLinkActions(
    appendContainerAction(wireActionsToLinkItems(merged.actions), merged)
  );

  const actionOsDock = merged.actionOsDock;

  return applyDisclosureToOrchestratorResult(
    {
      summary,
      actions: wired,
      source: input.source,
      confidence,
      thought: merged.thought,
      metadata: merged.metadata,
      schedule: merged.schedule,
      container: merged.container,
      confirmation: merged.confirmation,
      actionOsDock,
      actionsRevealed: Boolean(actionOsDock),
    },
    confidence
  );
}

export function buildRuleScheduleBlock(input: {
  message: string;
  existingSchedule: ExistingScheduleInput;
  tasks: DayScheduleTask[];
}): OrchestratorScheduleWire {
  const conflict = detectScheduleConflict({
    proposed: input.tasks,
    existing: input.existingSchedule,
  });

  return {
    is_conflict: conflict.isConflict,
    message: conflict.isConflict
      ? `${conflict.overlaps[0]?.existing.time ?? ""} 일정과 겹려요.`
      : "",
    tasks: input.tasks,
  };
}
