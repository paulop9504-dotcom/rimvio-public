import { buildConfirmationOrchestratorResult } from "@/lib/action-chat/confirmation-logic";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { buildAgentOutput } from "@/lib/global-brain/agent-output-types";
import {
  parseScheduleListBatch,
  type ParsedScheduleListBatch,
} from "@/lib/schedule/parse-schedule-list-batch";

/**
 * Batch schedule list — split multi-line day plans into batch_pending DATETIME items.
 */
export function orchestrateScheduleListBatch(input: {
  message: string;
  referenceDate: string;
}): OrchestratorResult | null {
  const parsed = parseScheduleListBatch(input.message, input.referenceDate);
  if (!parsed) {
    return null;
  }

  return buildScheduleListBatchResult(parsed);
}

export function buildScheduleListBatchResult(
  parsed: ParsedScheduleListBatch
): OrchestratorResult {
  const count = parsed.items.length;
  const agent = buildAgentOutput({
    action: "SCHEDULE",
    data: {
      dateKey: parsed.dateKey,
      items: parsed.items.map((item) => ({
        time: item.time,
        task: item.task,
        datetime: item.datetime,
        vitality: item.vitality ?? null,
      })),
    },
    reasoning: `ScheduleListBatch · ${count} items · ${parsed.dateKey}`,
    self_reflection: `First-item-only trap avoided — all ${count} lines queued in batch_pending.`,
  });

  const primary = parsed.items[0]!;

  return {
    ...buildConfirmationOrchestratorResult({
      persona_message: `**${parsed.dateLabel}** 일정 ${count}개를 확인했어요. 모두 등록할까요?`,
      data_prompt: `총 ${count}개 일정 — 아래 항목을 한 번에 저장합니다.`,
      extracted_data: {
        datetime: primary.datetime,
        place_name: primary.task,
        address: null,
        phone: null,
        url: null,
      },
      confidence: 0.96,
      thought: agent.self_reflection,
      confirm_data: {
        subject: parsed.dateKey,
        category: "TIME",
      },
      batch_pending: parsed.items.map((item) => ({
        type: "DATETIME",
        summary: `${item.time} ${item.task}`,
        extracted_data: {
          datetime: item.datetime,
          schedule_note: item.vitality ? `${item.task} [${item.vitality}]` : item.task,
          place_name: item.task.slice(0, 48),
          address: null,
          phone: null,
          url: null,
        },
      })),
    }),
    batchResults: parsed.items.map((item) => ({
      type: "DATETIME",
      summary: `${item.time} ${item.task}`,
      extracted_data: {
        datetime: item.datetime,
        schedule_note: item.task,
        place_name: item.task.slice(0, 48),
        address: null,
        phone: null,
        url: null,
      },
      actions: [],
    })),
    presentation: { mode: "ACTION" },
    metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
    thought: agent.reasoning,
  };
}
