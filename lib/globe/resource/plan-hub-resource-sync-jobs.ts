import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { isLodgingInventoryMisanchored } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { resolveApiWakeupDecision } from "@/lib/globe/resource/api-wakeup-controller";
import type { ApiProviderId, ApiWakeupPhase } from "@/lib/globe/resource/api-wakeup-types";
import { buildApiWakeupContextFromEvent } from "@/lib/globe/resource/build-api-wakeup-context";
import { readResourceLastSyncedAtIso } from "@/lib/globe/resource/context-resource-sync-metadata";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import { resolveApiProviderForHubResource } from "@/lib/globe/resource/resolve-resource-api-provider";
import type { ContextResource } from "@/lib/globe/resource/types";

export type HubResourceSyncJob = {
  resource: ContextResource;
  providerId: ApiProviderId;
  sourceHubId: ContextHubServiceId;
  rankIndex: number;
  phase: ApiWakeupPhase;
  isMain: boolean;
};

/** Rank revision → sync jobs gated by ApiWakeupController. */
export function planHubResourceSyncJobs(input: {
  ranked: readonly RankedContextResource[];
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
  now?: Date;
  appForeground?: boolean;
}): HubResourceSyncJob[] {
  const now = input.now ?? new Date();
  const jobs: HubResourceSyncJob[] = [];
  const seenHubProviders = new Set<string>();

  input.ranked.forEach((entry, rankIndex) => {
    const sourceHubId = entry.hubRow.serviceId;
    const providerId = resolveApiProviderForHubResource(sourceHubId);
    if (!providerId || !entry.hubRow.offered) {
      return;
    }

    const dedupeKey = `${sourceHubId}:${providerId}`;
    if (seenHubProviders.has(dedupeKey)) {
      return;
    }
    seenHubProviders.add(dedupeKey);

    const lastSyncedAtIso = readResourceLastSyncedAtIso(input.event, sourceHubId);
    const context = buildApiWakeupContextFromEvent({
      event: input.event,
      now,
      lat: input.lat,
      lng: input.lng,
      appForeground: input.appForeground,
      lastSyncedAtIso,
    });

    const decision = resolveApiWakeupDecision(providerId, context);
    const lodgingMisanchored =
      providerId === "places_lodging" && isLodgingInventoryMisanchored(input.event);
    if (!decision.allowFetch && !lodgingMisanchored) {
      return;
    }

    jobs.push({
      resource: {
        ...entry.resource,
        lastSyncedAtIso,
      },
      providerId,
      sourceHubId,
      rankIndex,
      phase: decision.phase,
      isMain: rankIndex === 0,
    });
  });

  return jobs.sort((left, right) => {
    if (left.isMain !== right.isMain) {
      return left.isMain ? -1 : 1;
    }
    return left.rankIndex - right.rankIndex;
  });
}

export function hubResourceSyncRevisionKey(input: {
  contextEventId: string;
  ranked: readonly RankedContextResource[];
  lat?: number | null;
  lng?: number | null;
}): string {
  const main = input.ranked[0];
  const coords =
    input.lat != null && input.lng != null
      ? `${input.lat.toFixed(3)},${input.lng.toFixed(3)}`
      : "no-gps";
  return [
    input.contextEventId,
    main?.resource.resourceId ?? "none",
    String(main?.rankScore ?? 0),
    coords,
    input.ranked.length,
  ].join("|");
}
