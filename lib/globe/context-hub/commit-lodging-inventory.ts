import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "@/lib/globe/context-hub/lodging-resource-types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function commitLodgingInventoryToEvent(input: {
  event: EventCandidate;
  inventory: readonly ContextLodgingInventoryRow[];
  inventorySource?: string | null;
}): EventCandidate {
  const stamp = new Date().toISOString();

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    description: input.event.description,
    metadata: {
      ...(input.event.metadata ?? {}),
      [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
      [CONTEXT_LODGING_INVENTORY_META_KEY]: [...input.inventory],
      contextLodgingInventorySource: input.inventorySource ?? null,
      feedPlanEnabled: input.event.metadata?.feedPlanEnabled ?? true,
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}
