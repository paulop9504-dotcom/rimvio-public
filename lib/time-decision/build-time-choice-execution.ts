import { buildExtractedDataFromText } from "@/lib/action-chat/confirmation-logic";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ScheduledActionDelivery } from "@/lib/action-chat/scheduled-action-delivery";
import { extractTaskLabelFromMessage } from "@/lib/time-decision/extract-task-label";
import type { ParsedAbsoluteTime, TimeChoiceOption } from "@/lib/time-decision/types";

function formatAbsoluteTimerSummary(input: {
  clockLabel: string;
  task: string;
  mode: "countdown" | "both";
}): string {
  if (input.mode === "both") {
    return `${input.clockLabel} ${input.task} 일정을 저장하고, ${input.clockLabel}까지 타이머도 맞췄어요.`;
  }
  return `${input.clockLabel} ${input.task}까지 타이머를 맞췄어요. 시간되면 알려드릴게요.`;
}

export function buildTimeChoiceExecutionResult(input: {
  message: string;
  referenceDate: string;
  parsed: ParsedAbsoluteTime;
  mode: TimeChoiceOption["mode"];
  missingPlace?: boolean;
}): OrchestratorResult | null {
  const task = extractTaskLabelFromMessage(input.message);
  const extracted = buildExtractedDataFromText(input.message, input.referenceDate);
  extracted.datetime = input.parsed.iso;
  if (task !== "일정") {
    extracted.place_name = extracted.place_name ?? task;
  }

  const runTimer = input.mode === "countdown" || input.mode === "both";
  const runCalendarOnly =
    input.mode === "calendar" || input.mode === "today" || input.mode === "tomorrow";

  if (runTimer) {
    const scheduledDelivery: ScheduledActionDelivery = {
      fire_at: input.parsed.iso,
      status: "pending",
    };

    return {
      summary: formatAbsoluteTimerSummary({
        clockLabel: input.parsed.clockLabel,
        task,
        mode: input.mode === "both" ? "both" : "countdown",
      }),
      actions: [],
      source: "rules",
      confidence: 0.95,
      disclosure: "high",
      actionsRevealed: true,
      pendingConfirm: false,
      scheduledDelivery,
      scheduleExtract: extracted,
      timeChoiceExecution: { mode: input.mode },
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      presentation: { mode: "TIMELINE" },
      thought: `TimeDecision · execute · ${input.mode}`,
    };
  }

  if (runCalendarOnly) {
    return {
      summary: `${input.parsed.clockLabel} ${task} 일정을 저장했어요.`,
      actions: [],
      source: "rules",
      confidence: 0.94,
      disclosure: "high",
      actionsRevealed: true,
      pendingConfirm: false,
      scheduleExtract: extracted,
      timeChoiceExecution: { mode: input.mode },
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      presentation: { mode: "TIMELINE" },
      thought: `TimeDecision · execute · ${input.mode}`,
    };
  }

  return null;
}
