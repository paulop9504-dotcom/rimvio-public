import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  contextGardenSnapshotChanged,
  organizeContextGarden,
} from "@/lib/globe/context-gardener/organize-context-garden";
import type { OrganizeContextGardenInput } from "@/lib/globe/context-gardener/organize-context-garden";
import { readContextGardenSnapshot } from "@/lib/globe/context-gardener/read-context-garden";
import {
  CONTEXT_GARDEN_META_KEY,
  type ContextGardenSnapshot,
  type ContextResourceGardenState,
} from "@/lib/globe/context-gardener/types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function commitContextGardenSnapshot(input: {
  event: EventCandidate;
  snapshot: ContextGardenSnapshot;
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
      [CONTEXT_GARDEN_META_KEY]: input.snapshot,
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}

export function organizeAndCommitContextGarden(
  input: OrganizeContextGardenInput,
): { event: EventCandidate; snapshot: ContextGardenSnapshot; changed: boolean } {
  const snapshot = organizeContextGarden(input);
  const previous = readContextGardenSnapshot(input.event);
  const changed = contextGardenSnapshotChanged(previous, snapshot);
  if (!changed) {
    return { event: input.event, snapshot, changed: false };
  }
  const event = commitContextGardenSnapshot({ event: input.event, snapshot });
  return { event, snapshot, changed: true };
}

export function markContextResourceDone(input: {
  event: EventCandidate;
  resourceId: string;
  now?: Date;
}): EventCandidate {
  const resourceId = input.resourceId.trim();
  if (!resourceId) {
    return input.event;
  }

  const nowIso = (input.now ?? new Date()).toISOString();
  const existing = readContextGardenSnapshot(input.event);
  const resourceStates: Record<string, ContextResourceGardenState> = {
    ...(existing?.resourceStates ?? {}),
    [resourceId]: { status: "done", updatedAtIso: nowIso },
  };
  const archivedResourceIds = new Set(existing?.archivedResourceIds ?? []);
  archivedResourceIds.add(resourceId);

  const snapshot: ContextGardenSnapshot = {
    updatedAtIso: nowIso,
    summary: existing?.summary ?? {
      headlineKo: input.event.title.trim() || "맥락 · 지금 상태",
      linesKo: [],
    },
    subGroups: existing?.subGroups ?? [],
    hotResourceId:
      existing?.hotResourceId === resourceId ? null : existing?.hotResourceId ?? null,
    coldResourceIds: (existing?.coldResourceIds ?? []).filter((id) => id !== resourceId),
    archivedResourceIds: [...archivedResourceIds],
    resourceStates,
  };

  return commitContextGardenSnapshot({ event: input.event, snapshot });
}
