import type { GlobalBrainWire } from "@/lib/global-brain/types";
import { upsertActionEvent } from "@/lib/action-event-registry/action-event-store";

export function applyActionEventUpsertFromApi(
  patch: GlobalBrainWire["actionEventUpsert"]
) {
  if (!patch?.target_time_iso) {
    return;
  }

  upsertActionEvent({
    task: patch.task,
    placeName: patch.place_name,
    targetTimeIso: patch.target_time_iso,
    sourceMessage: patch.source_message,
    priority: patch.priority,
  });
}
