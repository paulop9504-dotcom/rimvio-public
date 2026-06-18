import type { EventCandidate } from "@/lib/events/event-candidate";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/events/event-store";
import { writeResourceSyncStamp } from "@/lib/globe/resource/context-resource-sync-metadata";
import { executeHubResourceProviderSync } from "@/lib/globe/resource/execute-hub-resource-provider-sync";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import {
  hubResourceSyncRevisionKey,
  planHubResourceSyncJobs,
  type HubResourceSyncJob,
} from "@/lib/globe/resource/plan-hub-resource-sync-jobs";

export type HubResourceSyncWorkerResult = {
  revisionKey: string;
  jobs: HubResourceSyncJob[];
  synced: string[];
  skipped: string[];
};

function emitEventCandidatesUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_CANDIDATES_UPDATED));
  }
}

/** Hub rank revision → JIT provider sync (MAIN first). */
export async function runHubResourceSyncWorker(input: {
  ranked: readonly RankedContextResource[];
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
  now?: Date;
  appForeground?: boolean;
}): Promise<HubResourceSyncWorkerResult> {
  const revisionKey = hubResourceSyncRevisionKey({
    contextEventId: input.event.id,
    ranked: input.ranked,
    lat: input.lat,
    lng: input.lng,
  });

  const jobs = planHubResourceSyncJobs(input);
  const synced: string[] = [];
  const skipped: string[] = [];
  const stamp = (input.now ?? new Date()).toISOString();

  for (const job of jobs) {
    const result = await executeHubResourceProviderSync({
      providerId: job.providerId,
      event: input.event,
      resource: job.resource,
      lat: input.lat,
      lng: input.lng,
    });

    if (!result.ok) {
      skipped.push(job.resource.resourceId);
      continue;
    }

    writeResourceSyncStamp({
      contextEventId: input.event.id,
      sourceHubId: job.sourceHubId,
      providerId: job.providerId,
      atIso: stamp,
    });
    synced.push(job.resource.resourceId);
  }

  if (synced.length > 0) {
    emitEventCandidatesUpdated();
  }

  return {
    revisionKey,
    jobs,
    synced,
    skipped,
  };
}
