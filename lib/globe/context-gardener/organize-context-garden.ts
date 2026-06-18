import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { buildGardenSummary } from "@/lib/globe/context-gardener/build-garden-summary";
import { groupContextResources } from "@/lib/globe/context-gardener/group-context-resources";
import { readContextGardenSnapshot } from "@/lib/globe/context-gardener/read-context-garden";
import { resolveSanitizedResourceStates } from "@/lib/globe/context-gardener/sanitize-context-resources";
import type { ContextGardenSnapshot } from "@/lib/globe/context-gardener/types";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";

export type OrganizeContextGardenInput = {
  event: EventCandidate;
  ranked: readonly RankedContextResource[];
  services: readonly ContextHubServiceRow[];
  now?: Date;
};

/** Deterministic gardener — group · prune · sanitize · summarize. */
export function organizeContextGarden(
  input: OrganizeContextGardenInput,
): ContextGardenSnapshot {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const existing = readContextGardenSnapshot(input.event);

  const sanitized = resolveSanitizedResourceStates({
    event: input.event,
    ranked: input.ranked,
    existingStates: existing?.resourceStates,
    now,
  });

  const activeRanked = sanitized.activeRanked;
  const hot = activeRanked[0] ?? null;
  const coldResourceIds = activeRanked.slice(1).map((entry) => entry.resource.resourceId);
  const subGroups = groupContextResources({
    event: input.event,
    activeRanked,
  });

  const summary = buildGardenSummary({
    event: input.event,
    services: input.services,
    activeRanked,
    hot,
    subGroupCount: subGroups.length,
    now,
  });

  return {
    updatedAtIso: nowIso,
    summary,
    subGroups,
    hotResourceId: hot?.resource.resourceId ?? null,
    coldResourceIds,
    archivedResourceIds: sanitized.archivedResourceIds,
    resourceStates: sanitized.resourceStates,
  };
}

function stableSnapshotKey(snapshot: ContextGardenSnapshot): string {
  const { updatedAtIso: _stamp, ...rest } = snapshot;
  return JSON.stringify(rest);
}

export function contextGardenSnapshotChanged(
  previous: ContextGardenSnapshot | null,
  next: ContextGardenSnapshot,
): boolean {
  if (!previous) {
    return true;
  }
  return stableSnapshotKey(previous) !== stableSnapshotKey(next);
}
