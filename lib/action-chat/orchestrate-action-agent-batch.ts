import {
  estimateRuleOrchestratorConfidence,
} from "@/lib/action-chat/action-confidence";
import {
  actionAgentBatchToItems,
  isActionAgentBatchCandidate,
  processActionAgentBatch,
} from "@/lib/action-chat/action-agent-batch";
import type { ActionAgentBatchItem } from "@/lib/action-chat/action-agent-types";
import { normalizeMasterOrchestratorWire } from "@/lib/action-chat/normalize-master-result";
import type { MasterOrchestratorWire, OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { resolveActionAgentReferenceDate } from "@/lib/action-chat/action-agent-prompt";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

function trimSummary(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 80);
}

function batchItemsToOrchestratorResult(
  items: ActionAgentBatchItem[],
  input: { message: string; existingSchedule?: ExistingScheduleInput }
): OrchestratorResult {
  const primary = items[0]!;
  const wire: MasterOrchestratorWire = {
    summary: trimSummary(`${items.length}건 추출 · ${primary.summary}`),
    confidence_score: estimateRuleOrchestratorConfidence({
      message: input.message,
      actionCount: primary.actions.length,
      hasExplicitUrl: items.some((item) => Boolean(item.extracted_data.url)),
    }),
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
    },
    actions: primary.actions.map((action) => ({
      label: action.label,
      url: action.href ?? "",
      icon: typeof action.payload?.icon === "string" ? action.payload.icon : undefined,
    })),
    schedule: { is_conflict: false, message: "", tasks: [] },
    container: { action: "NONE", title: "", should_save: false },
  };

  const normalized = normalizeMasterOrchestratorWire({
    wire,
    source: "rules",
    existingSchedule: input.existingSchedule ?? [],
  });

  return {
    ...normalized,
    batchResults: items,
  };
}

export function tryActionAgentBatch(input: {
  message: string;
  referenceDate?: string | null;
  existingSchedule?: ExistingScheduleInput;
}): OrchestratorResult | null {
  const message = input.message.trim();
  if (!message || !isActionAgentBatchCandidate(message)) {
    return null;
  }

  const referenceDate = resolveActionAgentReferenceDate(input.referenceDate);
  const wire = processActionAgentBatch(message, { referenceDate });
  if (!wire || wire.results.length < 2) {
    return null;
  }

  const items = actionAgentBatchToItems(wire);
  if (items.length < 2) {
    return null;
  }

  return batchItemsToOrchestratorResult(items, {
    message,
    existingSchedule: input.existingSchedule,
  });
}

export { buildActionAgentSystemPrompt } from "@/lib/action-chat/action-agent-prompt";
export { buildMultiIntentDecomposerPrompt } from "@/lib/action-chat/multi-intent-decomposer-prompt";
export { decomposeInput, parseDecompositionJson } from "@/lib/action-chat/decompose-input";
export { dispatchTasks, decomposeAndDispatch } from "@/lib/action-chat/dispatch-tasks";
