import {
  actionAgentWiresToLinkItems,
  buildActionAgentTaskActions,
  normalizeActionAgentExtracted,
} from "@/lib/action-chat/build-action-agent-task-actions";
import type { ActionAgentTaskType } from "@/lib/action-chat/action-agent-types";
import type { BatchPendingItem } from "@/lib/action-chat/confirmation-types";
import type { LinkActionItem } from "@/types/database";

export function buildActionsFromBatchPending(
  pending: BatchPendingItem[] | undefined
): LinkActionItem[] {
  if (!pending?.length) {
    return [];
  }

  const actions: LinkActionItem[] = [];
  const seen = new Set<string>();

  for (const item of pending) {
    const extracted = normalizeActionAgentExtracted({
      address: item.extracted_data?.address ?? null,
      phone: item.extracted_data?.phone ?? null,
      datetime: item.extracted_data?.datetime ?? null,
      place_name: item.extracted_data?.place_name ?? null,
      url: item.extracted_data?.url ?? null,
      schedule_note: item.extracted_data?.schedule_note ?? null,
    });

    const wires = buildActionAgentTaskActions(
      item.type as ActionAgentTaskType,
      extracted
    );

    for (const action of actionAgentWiresToLinkItems({
      type: item.type as ActionAgentTaskType,
      extracted_data: extracted,
      actions: wires,
    })) {
      const key = action.href ?? action.label;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      actions.push(action);
    }
  }

  return actions.slice(0, 4);
}
