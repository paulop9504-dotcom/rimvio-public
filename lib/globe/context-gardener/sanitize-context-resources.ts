import type { EventCandidate } from "@/lib/events/event-candidate";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import type { ContextResource } from "@/lib/globe/resource/types";
import type {
  ContextResourceGardenState,
  ContextResourceGardenStatus,
} from "@/lib/globe/context-gardener/types";

const EXPIRED_GRACE_MS = 2 * 60 * 60 * 1000;

export function isResourceExpiredForGarden(
  resource: ContextResource,
  nowMs: number,
): boolean {
  const untilMs = parseIsoMs(resource.spacetime.validUntilIso ?? null);
  if (untilMs === null) {
    return false;
  }
  return nowMs > untilMs + EXPIRED_GRACE_MS;
}

function isResourceExpired(resource: ContextResource, nowMs: number): boolean {
  return isResourceExpiredForGarden(resource, nowMs);
}

export function resolveSanitizedResourceStates(input: {
  event: EventCandidate;
  ranked: readonly RankedContextResource[];
  existingStates?: Record<string, ContextResourceGardenState>;
  now?: Date;
}): {
  resourceStates: Record<string, ContextResourceGardenState>;
  archivedResourceIds: string[];
  activeRanked: RankedContextResource[];
} {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const resourceStates: Record<string, ContextResourceGardenState> = {
    ...(input.existingStates ?? {}),
  };
  const archivedResourceIds = new Set<string>();

  for (const entry of input.ranked) {
    const resourceId = entry.resource.resourceId;
    const prior = resourceStates[resourceId];
    let status: ContextResourceGardenStatus = prior?.status ?? "active";

    if (status === "active" && isResourceExpired(entry.resource, nowMs)) {
      status = "expired";
    }

    resourceStates[resourceId] = {
      status,
      updatedAtIso:
        prior?.status === status ? prior.updatedAtIso : nowIso,
    };

    if (status === "done" || status === "expired") {
      archivedResourceIds.add(resourceId);
    }
  }

  const activeRanked = input.ranked.filter(
    (entry) => !archivedResourceIds.has(entry.resource.resourceId),
  );

  return {
    resourceStates,
    archivedResourceIds: [...archivedResourceIds],
    activeRanked,
  };
}
