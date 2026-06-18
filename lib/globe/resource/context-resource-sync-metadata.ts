import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import type { ApiProviderId } from "@/lib/globe/resource/api-wakeup-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const CONTEXT_RESOURCE_SYNC_META_KEY = "contextResourceSync";

export type ContextResourceSyncRow = {
  lastSyncedAtIso: string;
  providerId?: ApiProviderId;
};

export type ContextResourceSyncMap = Partial<
  Record<string, ContextResourceSyncRow>
>;

function readSyncMap(event: EventCandidate): ContextResourceSyncMap {
  const raw = event.metadata?.[CONTEXT_RESOURCE_SYNC_META_KEY];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const map: ContextResourceSyncMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const row = value as Record<string, unknown>;
    const lastSyncedAtIso =
      typeof row.lastSyncedAtIso === "string" ? row.lastSyncedAtIso.trim() : "";
    if (!lastSyncedAtIso) {
      continue;
    }
    map[key] = {
      lastSyncedAtIso,
      providerId:
        typeof row.providerId === "string"
          ? (row.providerId as ApiProviderId)
          : undefined,
    };
  }
  return map;
}

export function readResourceLastSyncedAtIso(
  event: EventCandidate,
  sourceHubId: string,
): string | null {
  return readSyncMap(event)[sourceHubId]?.lastSyncedAtIso ?? null;
}

/** Persist provider sync stamp on context event — Resource SSOT sidecar. */
export function writeResourceSyncStamp(input: {
  contextEventId: string;
  sourceHubId: string;
  providerId: ApiProviderId;
  atIso?: string;
}): EventCandidate {
  const event = findEventCandidate(input.contextEventId.trim());
  if (!event) {
    throw new Error("context_event_not_found");
  }

  const stamp = input.atIso?.trim() || new Date().toISOString();
  const prior = readSyncMap(event);

  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    metadata: {
      ...(event.metadata ?? {}),
      [CONTEXT_RESOURCE_SYNC_META_KEY]: {
        ...prior,
        [input.sourceHubId]: {
          lastSyncedAtIso: stamp,
          providerId: input.providerId,
        },
      },
      feedPlanEnabled: event.metadata?.feedPlanEnabled ?? true,
    },
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}
